import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { Observable, Subject } from 'rxjs';
import { Ethers } from 'src/ethers/ethers';

@Injectable()
export class BlockCacheService implements OnModuleInit {
  private blockCache: BlockWithTransactions[] = [];
  private readonly MAX_CACHE_SIZE;
  private newBlockObservable: Observable<BlockWithTransactions>;
  private provider: ethers.providers.WebSocketProvider;
  private readonly logger = new Logger(BlockCacheService.name);
  private blockAppendedSubject = new Subject<BlockWithTransactions>();
  private latestBlockNumber: number;
  private latestBlockWithTransactions: BlockWithTransactions;

  constructor(
    private readonly ethersProvider: Ethers,
    private readonly configService: ConfigService,
  ) {
    this.MAX_CACHE_SIZE =
      this.configService.getOrThrow<number>('max_cache_size');
    this.newBlockObservable = this.ethersProvider.getNewBlockObservable();
    this.provider = this.ethersProvider.getWebsocketProvider();
  }

  async onModuleInit() {
    await this.backfillCache();
    this.newBlockObservable.subscribe(
      async (blockWithTransactions: BlockWithTransactions) => {
        this.logger.debug(
          `Received new block: ${blockWithTransactions.number}`,
        );
        this.enforceCacheLimit();
        await this.appendBlockToCache(blockWithTransactions);
      },
    );
  }

  async onModuleDestroy() {
    this.blockAppendedSubject.unsubscribe();
  }

  private async backfillCache() {
    if (!this.isBlockNumberSequential(this.latestBlockNumber)) {
      this.logger.debug('Cache is already initialized, skipping backfill');
      return;
    }
    this.latestBlockNumber = await this.ethersProvider.getLatestBlockNumber();
    const startingBlock = Math.max(
      this.latestBlockNumber - this.MAX_CACHE_SIZE + 1,
      0,
    );

    for (
      let blockNumber = startingBlock;
      blockNumber <= this.latestBlockNumber;
      blockNumber++
    ) {
      const latestBlockWithTransactions =
        await this.ethersProvider.getLatestBlockWithTransactions(blockNumber);
      await this.appendBlockToCache(latestBlockWithTransactions);
    }
  }

  private async appendBlockToCache(
    blockWithTransactions: BlockWithTransactions,
  ) {
    if (!this.isBlockNumberSequential(blockWithTransactions.number)) {
      throw new Error('Unexpected block number sequence');
    }
    this.enforceCacheLimit();

    this.blockCache.push(blockWithTransactions);
  }

  private enforceCacheLimit() {
    if (this.blockCache.length > this.MAX_CACHE_SIZE) {
      this.blockCache.shift(); // Remove oldest block
    }
  }

  getBlockAppendedObservable(): Observable<BlockWithTransactions> {
    return this.blockAppendedSubject.asObservable();
  }

  async isCacheFull(): Promise<boolean> {
    return this.blockCache.length === this.MAX_CACHE_SIZE;
  }

  getLatestBlockFromCache(): BlockWithTransactions {
    // access the last item pused into cache array
    if (this.blockCache.length == 0)
      throw new Error('No blocks found in cache');
    return this.blockCache[this.blockCache.length - 1];
  }

  getLatestNBlocks(n: number): BlockWithTransactions[] {
    if (n > this.MAX_CACHE_SIZE)
      throw new BadRequestException(
        `${n} exceed hard limit ${this.MAX_CACHE_SIZE}`,
      );
    return this.blockCache.slice(-n);
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

  private isBlockNumberSequential(blockNumber: number): boolean {
    if (this.blockCache && this.blockCache.length == 0) return true; //when the cache is empty return true

    const lastCachedBlockNumber = this.getLatestBlockFromCache().number;
    return (
      blockNumber === lastCachedBlockNumber + 1 ||
      blockNumber === lastCachedBlockNumber
    );
  }
}
