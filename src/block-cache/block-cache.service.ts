import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LRUCache } from 'lru-cache';
import { Observable, Subject, distinct } from 'rxjs';
import { Ethers } from '../ethers/ethers';

@Injectable()
export class BlockCacheService implements OnModuleInit, OnModuleDestroy {
  private blockCache: LRUCache<number, BlockWithTransactions>;
  private readonly MAX_CACHE_SIZE: number;
  private readonly BLOCK_INTERVAL: number;
  private newBlockObservable: Observable<BlockWithTransactions>;
  private readonly logger = new Logger(BlockCacheService.name);
  private blockAppendedSubject = new Subject<BlockWithTransactions>();
  private latestBlockNumber: number;

  constructor(
    private readonly ethersProvider: Ethers,
    private readonly configService: ConfigService,
  ) {
    this.MAX_CACHE_SIZE =
      this.configService.getOrThrow<number>('MAX_CACHE_SIZE');
    this.BLOCK_INTERVAL =
      this.configService.getOrThrow<number>('BLOCK_INTERVAL');
    this.blockCache = new LRUCache({
      max: Number(this.MAX_CACHE_SIZE),
    }); // Initialize LRU cache
  }

  async onModuleInit() {
    await this.initialBackfillCache();
    this.logger.debug(
      `BlockCacheService initialized with max cache size: ${this.MAX_CACHE_SIZE} and block interval: ${this.BLOCK_INTERVAL} upto ${this.getLatestBlockFromCache().number}`,
    );
    this.subscribeToNewBlockWithTransactionsEvent();
  }

  async onModuleDestroy() {
    this.blockAppendedSubject.unsubscribe();
  }

  /**
   * Subscribes to the new block event from the Ethers provider,
   * handling block appending, duplicate block detection,
   * and sequential gap filling logic.
   */
  private subscribeToNewBlockWithTransactionsEvent() {
    this.newBlockObservable = this.ethersProvider.getNewBlockObservable();

    this.newBlockObservable.subscribe({
      next: async (blockWithTransactions) => {
        this.handleDuplicateBlock(blockWithTransactions.number);
        this.logger.debug(
          `Received new block: ${blockWithTransactions.number}`,
        );
        this.latestBlockNumber = blockWithTransactions.number;

        if (!this.isBlockNumberSequential(this.latestBlockNumber))
          await this.backfillSequentialGaps();
        else await this.appendBlockToCache(blockWithTransactions);

        this.emitBlockOnCacheUpdate(blockWithTransactions);
      },
    });
  }

  /**
   * Handles duplicate block events, logging appropriate messages.
   * @param blockNumber - The block number.
   */
  private handleDuplicateBlock(blockNumber: number) {
    if (!this.shouldProcessNewBlock(blockNumber)) {
      this.logger.debug(`Skipping duplicate block: ${blockNumber}`);
      return;
    }
    this.logger.debug(`Received duplicate block: ${blockNumber}`);
  }

  /**
   * Determines if a new block should be processed by comparing it
   * to the latest cached block number.
   * @param blockNumber - The block number to check.
   * @returns `true` if the block is newer, `false` otherwise.
   */
  private shouldProcessNewBlock(blockNumber: number): boolean {
    return !this.latestBlockNumber || this.latestBlockNumber < blockNumber;
  }

  /**
   * Fetches blocks to populate the cache during initialization.
   * Handles cases where blocks might arrive out-of-order.
   */
  private async initialBackfillCache() {
    // Update latestBlockNumber if needed:
    this.latestBlockNumber = await this.ethersProvider.getLatestBlockNumber();
    this.logger.debug('backfilling blocks');

    // Determine startingBlock:
    const startingBlock = this.latestBlockNumber - this.MAX_CACHE_SIZE + 1; // Increment to fetch the next block

    this.logger.debug(
      `Latest block number to backfill from ${startingBlock} upto
      ${this.latestBlockNumber}`,
    );
    await this.fillBlocksInCache(startingBlock);
  }

  /**
   * Fetches blocks to fill gaps in the cache when blocks are missed.
   */
  private async backfillSequentialGaps() {
    const startingBlock = this.getLatestBlockFromCache().number + 1;
    await this.fillBlocksInCache(startingBlock);
  }

  /**
   * Iterates and fetches blocks within a range, adding them to the cache.
   * @param startingBlock - The block number at which to start fetching.
   */
  private async fillBlocksInCache(startingBlock: number) {
    // Only proceed if startingBlock is valid:
    if (startingBlock <= this.latestBlockNumber) {
      for (
        let blockNumber = startingBlock;
        blockNumber <= this.latestBlockNumber;
        blockNumber++
      ) {
        if (this.hasBlockInCache(blockNumber)) {
          this.logger.debug(
            `Block already present in the cache: ${blockNumber}`,
          );
          continue;
        }
        const latestBlockWithTransactions =
          await this.ethersProvider.getBlockWithTransactionsByNumber(
            blockNumber,
          );
        await this.appendBlockToCache(latestBlockWithTransactions);
      }
    }
  }

  /**
   * Adds a block to the LRU cache and emits an event if the cache is full.
   * Handles cases where a block might already be present.
   * @param blockWithTransactions - The block to add.
   */
  private async appendBlockToCache(
    blockWithTransactions: BlockWithTransactions,
  ) {
    if (this.hasBlockInCache(blockWithTransactions.number)) {
      this.logger.debug(
        `Block already present in the cache: ${blockWithTransactions.number}`,
      );
      return;
    }

    this.logger.debug(
      `Adding block: ${blockWithTransactions.number}, Cache size before adding: ${this.blockCache.size}`,
    );

    // Add to LRU with the block timestamp
    this.blockCache.set(blockWithTransactions.number, blockWithTransactions);
    this.logger.debug(
      `Block From : ${this.getLatestBlockFromCache().number} appending to cache: ${blockWithTransactions.number}`,
    );
    this.logger.debug('Cache size after adding:', this.blockCache.size);
  }

  /**
   * Returns an Observable that emits new blocks as they are added to the cache.
   * Filters out duplicate blocks.
   * @returns An Observable emitting new blocks.
   */
  getBlockAppendedObservable(): Observable<BlockWithTransactions> {
    return this.blockAppendedSubject
      .asObservable()
      .pipe(distinct((block: BlockWithTransactions) => block.number));
  }

  /**
   * Checks if the cache has reached its maximum capacity.
   * @returns `true` if the cache is full, `false` otherwise.
   */
  isCacheUpdated(): boolean {
    return this.blockCache.size === this.MAX_CACHE_SIZE;
  }

  /**
   * Emits a new block on the `blockAppendedSubject` when
   * the cache is full.
   * @param blockWithTransactions - The new block that triggered the event.
   */
  private emitBlockOnCacheUpdate(blockWithTransactions: BlockWithTransactions) {
    if (this.isCacheUpdated()) {
      this.blockAppendedSubject.next(blockWithTransactions);
    }
  }

  /**
   * Retrieves the block with the highest block number from the cache.
   * @returns The latest block in the cache.
   * @throws Error if the cache is empty.
   */
  getLatestBlockFromCache(): BlockWithTransactions {
    if (this.blockCache && this.isCacheEmpty()) {
      throw new Error('No blocks found in cache');
    }

    const latestKey = this.sortBlockCache().at(-1) as number;
    return this.blockCache.get(latestKey) as BlockWithTransactions;
  }

  /**
   * Retrieves the specified number of latest blocks from the cache.
   * @param n - The number of blocks to retrieve.
   * @returns An array of the 'n' latest blocks.
   * @throws BadRequestException if 'n' exceeds the maximum cache size.
   */
  getLatestNBlocks(n: number): BlockWithTransactions[] {
    if (n > this.MAX_CACHE_SIZE) {
      throw new BadRequestException(
        `${n} exceeds hard limit ${this.MAX_CACHE_SIZE}`,
      );
    }
    // Retrieve an array of the 'n' latest keys
    const cacheKeys = this.sortBlockCache().slice(-n);
    return cacheKeys.map((key) => this.blockCache.get(key)!);
  }

  /**
   * Checks if the provided block number is the next expected sequential block.
   * @param blockNumber - The block number to check.
   * @returns `true` if sequential, `false` otherwise.
   */
  private isBlockNumberSequential(blockNumber: number): boolean {
    return this.getLatestBlockFromCache().number + 1 === blockNumber;
  }

  /**
   * Checks if the block cache is currently empty.
   * @returns `true` if the cache has no entries, `false` otherwise.
   */
  private isCacheEmpty(): boolean {
    return this.blockCache.size === 0;
  }

  /**
   * Determines if a specific block is present in the cache.
   * @param blockNumber - The block number to check for.
   * @returns `true` if the block exists in the cache, `false` otherwise.
   */
  private hasBlockInCache(blockNumber: number): boolean {
    return !this.isCacheEmpty() && this.blockCache.has(blockNumber);
  }

  /**
   * Sorts the block numbers in the cache in ascending order.
   * @returns An array of sorted block numbers.
   */
  sortBlockCache(): Array<number> {
    const keys = Array.from(this.blockCache.keys());
    keys.sort();
    return keys;
  }

  /**
   * Checks if the provided block number matches the latest cached block number.
   * @param blockNumber - The block number to compare.
   * @returns `true` if the block number is the latest, `false` otherwise.
   */
  isLatestBlock(blockNumber: number): boolean {
    return blockNumber === this.latestBlockNumber;
  }

  /**
   * Determines if the cache is considered stale based on the timestamp of
   * the latest block and the configured block interval.
   * @returns `true` if the cache is stale, `false` otherwise.
   */
  isCacheStale(): boolean {
    const latestBlockTimestamp = this.getLatestBlockFromCache().timestamp;
    const currentTimestamp = Math.floor(Date.now() / 1000);

    const validBlockInterval = currentTimestamp - this.BLOCK_INTERVAL;
    return latestBlockTimestamp < validBlockInterval;
  }
}
