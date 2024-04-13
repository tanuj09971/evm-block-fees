import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockAnalyticsCacheService } from '../block-analytics-cache/block-analytics-cache.service';
import { BlockCacheService } from '../block-cache/block-cache.service';
import { BlockStatsService } from '../block-stats/block-stats.service';
import { Ethers } from '../ethers/ethers';
import { BlockFeesController } from './block-fees.controller';
import { BlockFeesService } from './block-fees.service';

@Module({
  controllers: [BlockFeesController],
  providers: [
    BlockFeesService,
    BlockCacheService,
    BlockStatsService,
    Ethers,
    BlockAnalyticsCacheService,
    ConfigService,
    Logger
  ],
})
export class BlockFeesModule {}
