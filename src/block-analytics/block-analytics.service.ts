import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { BigNumber } from 'ethers';
import { BlockStatsService } from 'src/block-stats/block-stats.service';
import { BlockCacheService } from '../block-cache/block-cache.service';

interface BlockStat {
  // Define the structure of your block statistics
  // Example:
  avgNativeEthTransferFee: BigNumber;
  // ... other stats
}

@Injectable()
export class BlockAnalyticsService implements OnModuleInit {
  private statsCache: Map<number, BlockStat> = new Map(); // Key: number of blocks, Value: stats
  private readonly statsForNBlocks = [1, 5, 30];

  constructor(
    private readonly blockCacheService: BlockCacheService,
    private blockStatService: BlockStatsService,
  ) {}

  async onModuleInit() {
    this.blockCacheService
      .getBlockAppendedObservable()
      .subscribe((block: BlockWithTransactions) => {
        this.updateStatsCache(block);
      });
  }

  getStateForLatestNBlocks(n: number) {
    if (n < 1 || n > 30) {
      throw new Error('Invalid block range');
    }
    return this.statsCache.get(n);
  }

  private updateStatsCache(newBlock: BlockWithTransactions): void {
    // Calculate stats for relevant ranges (1, 5, ... 30)
    for (const n of this.statsForNBlocks) {
      const latestNBlocks = this.blockCacheService.getLatestNBlocks(n);
      const statsForLatestNBlocks =
        this.blockStatService.calculateStats(latestNBlocks); // Delegate calculation
      this.statsCache.set(n, statsForLatestNBlocks); // Update cache
    }
  }
}
