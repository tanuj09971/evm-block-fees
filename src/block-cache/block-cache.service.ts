import { Injectable, OnModuleInit, Logger, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ethers } from 'ethers';
import { Observable, lastValueFrom, Subject } from 'rxjs';
import { ETHERS_PROVIDER, EthersProvider } from '../providers/ethers.provider'
import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { Retryable, BackOffPolicy, ExponentialBackoffStrategy } from 'typescript-retry-decorator';
import { ConfigService } from '@nestjs/config'; 

@Injectable()
export class BlockCacheService implements OnModuleInit {
  private blockCache: BlockWithTransactions[] = []; 
  private readonly MAX_CACHE_SIZE = 30; // TODO: Move this to global config
  private newBlockObservable = this.ethersProvider.getNewBlockObservable()
  private provider = this.ethersProvider.getProvider()
  private readonly logger = new Logger(BlockCacheService.name);
  private blockAppendedSubject = new Subject<BlockWithTransactions>();

  constructor(
    @Inject(ETHERS_PROVIDER) private readonly ethersProvider: EthersProvider,
    @Inject(ConfigService) private configService: ConfigService
  ) {}

  async onModuleInit() {
    await this.backfillCache();
    this.newBlockObservable.subscribe(async (blockNumber) => {
      await this.appendBlockToCache(blockNumber);
      this.enforceCacheLimit();
    });
  }

  @Retryable({
    maxAttempts: Number.MAX_VALUE,
    backOffPolicy: BackOffPolicy.ExponentialBackOffPolicy,
    backOff: 1000,
    exponentialOption: { maxInterval: 4000, multiplier: 2, backoffStrategy: ExponentialBackoffStrategy.EqualJitter },
  })
  private async getLatestBlockNumber() :Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    }      
    catch (e) {
      this.logger.error(`getLatestBlockNumber: ${e}`)
      throw  e
    }
  }

  @Retryable({
    maxAttempts: Number.MAX_VALUE,
    backOffPolicy: BackOffPolicy.ExponentialBackOffPolicy,
    backOff: 1000,
    exponentialOption: { maxInterval: 4000, multiplier: 2, backoffStrategy: ExponentialBackoffStrategy.EqualJitter }
  })
  private async getBlockWithTransactions(blockNumber: number) :Promise<BlockWithTransactions> {
    try {
      return await this.provider.getBlockWithTransactions(blockNumber)
    }      
    catch (e) {
      this.logger.error(`getBlockWithTransactions: ${e}`)
      throw  e
    }
  }

  private async backfillCache() {
    const latestBlockNumber = await this.getLatestBlockNumber()
    const startingBlock = Math.max(latestBlockNumber - this.MAX_CACHE_SIZE + 1, 0); // Ensure we don't fetch negative blocks

    for (let blockNumber = startingBlock; blockNumber <= latestBlockNumber; blockNumber++) {
      await this.appendBlockToCache(blockNumber);
    }
  }

  private async appendBlockToCache(blockNumber: number) {
    const newBlock: BlockWithTransactions = await this.getBlockWithTransactions(blockNumber);
    this.blockCache.push(newBlock);

    this.blockAppendedSubject.next(newBlock); // Emit the new block
  }

  private enforceCacheLimit() {
    if (this.blockCache.length > this.MAX_CACHE_SIZE) {
      this.blockCache.shift(); // Remove oldest block
    }
  }

  getBlockAppendedObservable(): Observable<BlockWithTransactions> {
    return this.blockAppendedSubject.asObservable();
  }

  async isCacheFull() :Promise<boolean> {
    return this.blockCache.length === this.MAX_CACHE_SIZE
  }

  getLatestBlock() :BlockWithTransactions {
    // access the last item pused into cache array
    return this.blockCache[-1]
  }

  getLatestNBlocks(n: number) :BlockWithTransactions[] {
    if (n > this.MAX_CACHE_SIZE) throw new BadRequestException(`${n} exceed hard limit ${this.MAX_CACHE_SIZE}`)
    return this.blockCache.slice(-n)
  }

  isCacheStale() :boolean {
    const latestBlockTimestamp = this.getLatestBlock().timestamp;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const blockInterval = this.configService.get<string>('BLOCK_INTERVAL');
    return true
  }
}