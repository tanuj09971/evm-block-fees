import { Module } from '@nestjs/common';
import { BlockAnalyticsCacheService } from '../block-analytics-cache/block-analytics-cache.service';
import { BlockFeesController } from './block-fees.controller';
import { BlockFeesService } from './block-fees.service';
import { ConfigService } from '@nestjs/config';
import { BlockCacheService } from '../block-cache/block-cache.service';
import { Ethers } from '../ethers/ethers';
import { BlockStatsService } from '../block-stats/block-stats.service';

@Module({
  controllers: [BlockFeesController],
  providers: [
    BlockFeesService,
    BlockCacheService,
    BlockStatsService,
    Ethers,
    BlockAnalyticsCacheService,
    ConfigService,
  ],
})
export class BlockFeesModule {}
