import { Injectable, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ethers } from 'ethers';
import { Observable, lastValueFrom } from 'rxjs';
import { ETHERS_PROVIDER, EthersProvider } from '../providers/ethers.provider'
import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { Retryable, BackOffPolicy, ExponentialBackoffStrategy } from 'typescript-retry-decorator';

@Injectable()
export class BlockCacheService implements OnModuleInit {
  private blockCache: BlockWithTransactions[] = []; 
  private readonly MAX_CACHE_SIZE = 30; // TODO: Move this to global config
  private newBlockObservable = this.ethersProvider.getNewBlockObservable()
  private provider = this.ethersProvider.getProvider()

  constructor(@Inject(ETHERS_PROVIDER) private readonly ethersProvider: EthersProvider) {}

  async onModuleInit() {
    await this.backfillCache();
    this.newBlockObservable.subscribe(async (blockNumber) => {
      await this.updateCache(blockNumber); 
    });
  }

  @Retryable({
    maxAttempts: 10,
    backOffPolicy: BackOffPolicy.ExponentialBackOffPolicy,
    backOff: 1000,
    exponentialOption: { maxInterval: 4000, multiplier: 2, backoffStrategy: ExponentialBackoffStrategy.EqualJitter }
  })
  private async getLatestBlockNumber() :Promise<number> {
    return await this.provider.getBlockNumber();
  }

  @Retryable({
    maxAttempts: 10,
    backOffPolicy: BackOffPolicy.ExponentialBackOffPolicy,
    backOff: 1000,
    exponentialOption: { maxInterval: 4000, multiplier: 2, backoffStrategy: ExponentialBackoffStrategy.EqualJitter }
  })
  private async getBlockWithTransactions(blockNumber: number) :Promise<BlockWithTransactions> {
    return await this.provider.getBlockWithTransactions(blockNumber)
  }

  private async backfillCache() {
    const latestBlockNumber = await this.getLatestBlockNumber()
    const startingBlock = Math.max(latestBlockNumber - this.MAX_CACHE_SIZE + 1, 0); // Ensure we don't fetch negative blocks

    for (let blockNumber = startingBlock; blockNumber <= latestBlockNumber; blockNumber++) {
      await this.updateCache(blockNumber); 
    }
  }

  private async updateCache(blockNumber: number) {
    const newBlock: BlockWithTransactions = await this.getBlockWithTransactions(blockNumber);
    this.blockCache.push(newBlock);
    if (this.blockCache.length > this.MAX_CACHE_SIZE) {
      this.blockCache.shift(); // Remove oldest block
    }
  }

  async isCacheFull() :Promise<boolean> {
    return this.blockCache.length === this.MAX_CACHE_SIZE
  }

  async latestBlock() :Promise<BlockWithTransactions> {
    // access the last item pused into cache array
    return this.blockCache[-1]
  }


  private getAllBlocksInCache(): BlockWithTransactions[] {
    return this.blockCache;
  }
}