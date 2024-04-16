import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockAnalyticsCacheService } from '../block-analytics-cache/block-analytics-cache.service';
import { BlockCacheModule } from '../block-cache/block-cache.module';
import { BlockStatsService } from '../block-stats/block-stats.service';
import { BlockFeesController } from './block-fees.controller';
import { BlockFeesService } from './block-fees.service';

@Module({
  imports: [BlockCacheModule],
  controllers: [BlockFeesController],
  providers: [
    BlockFeesService,
    BlockStatsService,
    BlockAnalyticsCacheService,
    ConfigService,
    Logger,
  ],
})
export class BlockFeesModule {}
