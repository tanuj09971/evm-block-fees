import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { ConfigService } from '@nestjs/config';
import { BlockCacheService } from 'src/block-cache/block-cache.service';
import { Ethers } from 'src/ethers/ethers';
import { BlockAnalyticsCacheService } from 'src/block-analytics-cache/block-analytics-cache.service';
import { BlockStatsService } from 'src/block-stats/block-stats.service';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
  providers: [
    ConfigService,
    BlockCacheService,
    Ethers,
    BlockAnalyticsCacheService,
    BlockStatsService,
  ],
})
export class HealthModule {}
