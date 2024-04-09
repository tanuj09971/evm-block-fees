import { Module } from '@nestjs/common';
import { BlockAnalyticsCacheService } from './block-analytics-cache.service';
import { BlockStatsService } from '../block-stats/block-stats.service';
import { BlockCacheService } from '../block-cache/block-cache.service';
import { Ethers } from '../ethers/ethers';

@Module({
  providers: [
    BlockAnalyticsCacheService,
    BlockStatsService,
    BlockCacheService,
    Ethers,
  ],
})
export class BlockAnalyticsCacheModule {}
