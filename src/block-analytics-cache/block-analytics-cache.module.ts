import { Module } from '@nestjs/common';
import { BlockCacheModule } from '../block-cache/block-cache.module';
import { BlockStatsService } from '../block-stats/block-stats.service';
import { BlockAnalyticsCacheService } from './block-analytics-cache.service';

@Module({
  imports: [BlockCacheModule],
  providers: [BlockAnalyticsCacheService, BlockStatsService],
})
export class BlockAnalyticsCacheModule {}
