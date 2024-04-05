import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigNumber } from 'ethers';
import { BlockCacheService } from 'src/block-cache/block-cache.service';
import { BlockStatsService } from 'src/block-stats/block-stats.service';
import { BlockStat } from 'src/types/ethers';

@Injectable()
export class BlockAnalyticsCacheService implements OnModuleInit {
  private statsCache: Map<number, BlockStat> = new Map(); // Key: number of blocks, Value: stats
  private readonly statsForNBlocks: Array<number>;
  private readonly MAX_CACHE_SIZE: number;

  constructor(
    private readonly blockCacheService: BlockCacheService,
    private blockStatService: BlockStatsService,
    private configService: ConfigService,
  ) {
    this.MAX_CACHE_SIZE =
      this.configService.getOrThrow<number>('max_cache_size');
    this.statsForNBlocks =
      this.configService.getOrThrow<Array<number>>('block_range');
  }

  async onModuleInit() {
    this.blockCacheService
      .getBlockAppendedObservable()
      .subscribe((block: BlockWithTransactions) => {
        this.updateStatsCache();
      });
  }

  getStatsForLatestNBlocks(n: number): BlockStat {
    return this.statsCache.get(n) as BlockStat;
  }

  private updateStatsCache(): void {
    // Calculate stats for relevant ranges (1, 5, ... 30)
    for (const n of this.statsForNBlocks) {
      const latestNBlocks = this.blockCacheService.getLatestNBlocks(n);
      const statsForLatestNBlocks =
        this.blockStatService.calculateStats(latestNBlocks); // Delegate calculation
      this.statsCache.set(n, statsForLatestNBlocks); // Update cache
    }
  }
}
