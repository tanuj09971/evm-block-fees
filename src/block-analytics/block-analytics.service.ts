import { Injectable, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { BlockCacheService } from './block-cache.service'; 
import { Observable } from 'rxjs'; 

interface BlockStat { 
  // Define the structure of your block statistics
  // Example:
  avgGasUsed: number;
  totalTransactions: number;
  // ... other stats 
}

@Injectable()
export class BlockAnalyticsService implements OnModuleInit {
  private statsCache: Map<number, BlockStat> = new Map(); // Key: number of blocks, Value: stats
  private readonly statsForNBlocks = [1,5,30]

  constructor(@Inject(BlockCacheService) private readonly blockCacheService: BlockCacheService) {}

  async onModuleInit() {
    this.blockCacheService.getBlockAppendedObservable().subscribe((block) => {
      this.updateStatsCache(block);
    });
  }

  getStateForLatestNBlocks(n: number) {
    return this.statsCache[n]
  }

  private updateStatsCache(newBlock: BlockWithTransactions) {
    // 1. Calculate stats for newBlock
    // 2. Update statsCache for relevant ranges (1, 5, ... 30)
    for stats_for_latest_n_blocks in this.statsForNBlocks {
      const stats_for_latest_n_blocks = await this.getStatsForLastNBlocks(i)
      this.statsCache(i)
    }
    
  }

  getStatsForLastNBlocks(n: number): BlockStat {
    const latetsNBlocks = this.blockCacheService.getLatestNBlocks(n)
    // if (n < 1 || n > 30) { 
    //   throw new Error('Invalid block range'); 
    // }

    // const cachedStats = this.statsCache.get(n);
    // if (cachedStats) {
    //   return cachedStats;
    // } else {
    //   // Recalculate if not in the cache 
    //   const stats = this.calculateStatsForLastNBlocks(n);
    //   this.statsCache.set(n, stats);
    //   return stats;
    // }
  }
}