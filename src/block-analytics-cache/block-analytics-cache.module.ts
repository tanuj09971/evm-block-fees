import { Module } from '@nestjs/common';
import { BlockAnalyticsCacheService } from './block-analytics-cache.service';
import { BlockStatsService } from 'src/block-stats/block-stats.service';
import { BlockCacheService } from 'src/block-cache/block-cache.service';
import { Ethers } from 'src/ethers/ethers';

@Module({
  providers: [
    BlockAnalyticsCacheService,
    BlockStatsService,
    BlockCacheService,
    Ethers,
  ],
})
export class BlockAnalyticsCacheModule {}
