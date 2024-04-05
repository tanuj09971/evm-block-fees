import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { LRUCache } from 'lru-cache';
import { ConfigService } from '@nestjs/config';
import { Observable, Subject } from 'rxjs';
import { Ethers } from 'src/ethers/ethers';

@Injectable()
export class BlockCacheService implements OnModuleInit, OnModuleDestroy {
  private blockCache: LRUCache<number, BlockWithTransactions>;
  private readonly MAX_CACHE_SIZE;
  private newBlockObservable: Observable<BlockWithTransactions>;
  private readonly logger = new Logger(BlockCacheService.name);
  private blockAppendedSubject = new Subject<BlockWithTransactions>();
  private latestBlockNumber: number;

  constructor(
    private readonly ethersProvider: Ethers,
    private readonly configService: ConfigService,
  ) {
    this.MAX_CACHE_SIZE =
      this.configService.getOrThrow<number>('max_cache_size');
    this.blockCache = new LRUCache({ max: Number(this.MAX_CACHE_SIZE) }); // Initialize LRU cache
  }

  async onModuleInit() {
    await this.backfillCache();
    this.newBlockObservable = this.ethersProvider.getNewBlockObservable();
    this.newBlockObservable.subscribe(async (blockWithTransactions) => {
      this.logger.debug(`Received new block: ${blockWithTransactions.number}`);
      await this.appendBlockToCache(blockWithTransactions);
    });
  }

  async onModuleDestroy() {
    this.blockAppendedSubject.unsubscribe();
  }

  private async backfillCache() {
    // Update latestBlockNumber if needed:
    if (
      this.isCacheEmpty() ||
      !this.isBlockNumberSequential(this.latestBlockNumber)
    ) {
      this.latestBlockNumber = await this.ethersProvider.getLatestBlockNumber();
    }

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
          return;
        }
        const latestBlockWithTransactions =
          await this.ethersProvider.getLatestBlockWithTransactions(blockNumber);
        await this.appendBlockToCache(latestBlockWithTransactions);
      }
    }
  }

  private async appendBlockToCache(
    blockWithTransactions: BlockWithTransactions,
  ) {
    const { number, timestamp } = blockWithTransactions;
    if (this.hasBlockInCache(number)) {
      this.logger.debug(`Block already present in the cache: ${number}`);
      return;
    }
    if (!this.isBlockNumberSequential(number)) {
      this.logger.error(
        `Unexpected block sequence, discarding block: ${number}`,
      );
      await this.backfillCache(); // Refill if the sequence breaks
    }

    this.logger.debug('Adding block:', number);
    this.logger.debug('Adding block timestamp:', timestamp);
    this.logger.debug('Cache size before adding:', this.blockCache.size);

    this.blockCache.set(number, blockWithTransactions, {
      ttl: timestamp,
    }); // Add to LRU
    this.logger.debug('Cache size after adding:', this.blockCache.size);
    this.blockAppendedSubject.next(blockWithTransactions);
  }

  getBlockAppendedObservable(): Observable<BlockWithTransactions> {
    return this.blockAppendedSubject.asObservable();
  }

  isCacheFull(): boolean {
    return this.blockCache.size === this.MAX_CACHE_SIZE;
  }

  getLatestBlockFromCache(): BlockWithTransactions {
    if (this.blockCache && this.blockCache.size === 0) {
      throw new Error('No blocks found in cache');
    }
    return this.blockCache.values().next().value as BlockWithTransactions;
  }

  getLatestNBlocks(n: number): BlockWithTransactions[] {
    if (n > this.MAX_CACHE_SIZE) {
      throw new BadRequestException(
        `${n} exceeds hard limit ${this.MAX_CACHE_SIZE}`,
      );
    }
    // Retrieve an array of the 'n' latest keys
    const keys = Array.from(this.blockCache.keys()).slice(-n);
    keys.sort();
    // this.logger.log('TCL: BlockCacheService -> keys', keys);

    // Efficiently build result array using map
    return keys.map((key) => this.blockCache.get(key)!);
  }

  private isBlockNumberSequential(blockNumber: number): boolean {
    if (this.isCacheEmpty()) return true;
    const lastCachedBlockNumber = this.getLatestBlockFromCache().number;
    return lastCachedBlockNumber + 1 === blockNumber;
  }

  private isCacheEmpty(): boolean {
    return this.blockCache.size === 0;
  }

  private hasBlockInCache(blockNumber: number): boolean {
    if (!this.isCacheEmpty() && this.blockCache.get(blockNumber)) {
      return true;
    }
    return false;
  }

  isCacheStale(): boolean {
    const latestBlockTimestamp = this.getLatestBlockFromCache().timestamp;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const blockInterval = this.configService.get<number>(
      'block_interval',
    ) as number;
    const validBlockInterval = currentTimestamp - blockInterval;
    return validBlockInterval < latestBlockTimestamp;
  }
}
