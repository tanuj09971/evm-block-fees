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
import { Observable, Subject, catchError, distinct } from 'rxjs';
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
      ttl: this.BLOCK_INTERVAL,
    }); // Initialize LRU cache
  }

  async onModuleInit() {
    await this.backfillCache();
    this.subscribeToNewBlockWithTransactionsEvent();
  }

  async onModuleDestroy() {
    this.blockAppendedSubject.unsubscribe();
  }

  private subscribeToNewBlockWithTransactionsEvent() {
    this.newBlockObservable = this.ethersProvider.getNewBlockObservable();

    this.newBlockObservable.subscribe({
      next: async (blockWithTransactions) => {
        if (
          !this.latestBlockNumber ||
          this.latestBlockNumber !== blockWithTransactions.number
        ) {
          this.logger.debug(
            `Received new block: ${blockWithTransactions.number}`,
          );
          this.latestBlockNumber = blockWithTransactions.number;
          if (!this.isBlockNumberSequential(this.latestBlockNumber))
            await this.backfillCache();

          await this.appendBlockToCache(blockWithTransactions);
        } else {
          this.logger.debug(
            `Skipping duplicate block: ${blockWithTransactions.number}`,
          );
        }
      },
    });
  }

  /*   `backfillCache`:
   *   Fetches the correct range of blocks.
   *   Populates the cache in the correct order.
   *   **Invalid Block Sequence:** `backfillCache` handles out-of-order blocks.
   *   Ensure it triggers cache refilling.
   *   Log appropriate errors or warnings. */
  private async backfillCache() {
    this.logger.debug('backfilling blocks');
    // Update latestBlockNumber if needed:
    this.latestBlockNumber = await this.ethersProvider.getLatestBlockNumber();
    this.logger.debug(
      'Latest block number to backfill upto',
      this.latestBlockNumber,
    );

    // Determine startingBlock:
    const startingBlock = this.isCacheEmpty()
      ? this.latestBlockNumber - this.MAX_CACHE_SIZE + 1
      : this.getLatestBlockFromCache().number + 1; // Increment to fetch the next block

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

  /*   **Successful Append:** Verify that `appendBlockToCache`:
    *   Correctly adds blocks to the LRU cache.
    *   Emits an event on `blockAppendedSubject`.
    
*   **Block Already Present:**  Ensure that if a block is already in the cache, it's not re-added and no duplicate event is emitted.  

*   **Cache Full:**  Test the behavior when the cache is full. Verify that:
    *   The oldest block is evicted (based on LRU).
    *   The new block is added. */
  private async appendBlockToCache(
    blockWithTransactions: BlockWithTransactions,
  ) {
    const { number, timestamp } = blockWithTransactions;
    if (this.hasBlockInCache(number)) {
      this.logger.debug(`Block already present in the cache: ${number}`);
      return;
    }

    this.logger.debug('Adding block:', number);
    this.logger.debug('Adding block timestamp:', timestamp);
    this.logger.debug('Cache size before adding:', this.blockCache.size);

    // Add to LRU with the block timestamp
    this.blockCache.set(number, blockWithTransactions, {
      ttl: timestamp,
    });
    this.logger.debug('Cache size after adding:', this.blockCache.size);
    this.emitIfCacheFull(blockWithTransactions);
  }

  getBlockAppendedObservable(): Observable<BlockWithTransactions> {
    return this.blockAppendedSubject
      .asObservable()
      .pipe(distinct((block: BlockWithTransactions) => block.number));
  }

  isCacheFull(): boolean {
    return this.blockCache.size === this.MAX_CACHE_SIZE;
  }

  private emitIfCacheFull(blockWithTransactions: BlockWithTransactions) {
    if (this.isCacheFull()) {
      this.blockAppendedSubject.next(blockWithTransactions);
    }
  }

  // *   **`getLatestBlockFromCache`:** Test that it returns the correct latest block.
  getLatestBlockFromCache(): BlockWithTransactions {
    if (this.blockCache && this.blockCache.size === 0) {
      throw new Error('No blocks found in cache');
    }

    const latestKey = this.sortBlockCache().at(-1) as number;
    return this.blockCache.get(latestKey) as BlockWithTransactions;
  }

  /*   **`getLatestNBlocks`:**
   *   Ensure it returns the correct number of blocks in the right order.
   *   Verify it handles the case where  `n` exceeds the cache size.
   *   Test that it throws the correct exception on an invalid value of `n`. */
  getLatestNBlocks(n: number): BlockWithTransactions[] {
    this.logger.debug(
      'TCL: BlockCacheService -> CacheSize',
      this.blockCache.size,
    );
    if (n > this.MAX_CACHE_SIZE) {
      throw new BadRequestException(
        `${n} exceeds hard limit ${this.MAX_CACHE_SIZE}`,
      );
    }
    // Retrieve an array of the 'n' latest keys
    const cacheKeys = this.sortBlockCache().slice(-n);
    return cacheKeys.map((key) => this.blockCache.get(key)!);
  }

  private isBlockNumberSequential(blockNumber: number): boolean {
    return (
      this.getLatestBlockFromCache().number + 1 === blockNumber &&
      this.hasBlockInCache(blockNumber)
    );
  }

  private isCacheEmpty(): boolean {
    return this.blockCache.size === 0;
  }

  private hasBlockInCache(blockNumber: number): boolean {
    return !this.isCacheEmpty() && !!this.blockCache.get(blockNumber);
  }

  sortBlockCache(): Array<number> {
    const keys = Array.from(this.blockCache.keys());
    keys.sort();
    return keys;
  }

  // *   **`isCacheStale`:** Test scenarios where the cache should and should not be considered stale based on the calculated timestamp.
  isCacheStale(): boolean {
    const latestBlockTimestamp = this.getLatestBlockFromCache().timestamp;
    const currentTimestamp = Math.floor(Date.now() / 1000);

    const validBlockInterval = currentTimestamp - this.BLOCK_INTERVAL;
    return latestBlockTimestamp < validBlockInterval;
  }
}
