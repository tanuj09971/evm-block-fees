import { Module } from '@nestjs/common';
import { BlockAnalyticsService } from './block-analytics.service';
import { BlockStatsService } from 'src/block-stats/block-stats.service';
import { BlockCacheService } from 'src/block-cache/block-cache.service';

@Module({
  providers: [BlockAnalyticsService, BlockStatsService, BlockCacheService],
})
export class BlockAnalyticsModule {}
