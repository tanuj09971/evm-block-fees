import { HttpModule } from '@nestjs/axios';
import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { BlockAnalyticsCacheService } from '../block-analytics-cache/block-analytics-cache.service';
import { BlockCacheModule } from '../block-cache/block-cache.module';
import { BlockStatsService } from '../block-stats/block-stats.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    TerminusModule.forRoot({
      gracefulShutdownTimeoutMs: 5000,
      errorLogStyle: 'pretty',
    }),
    HttpModule,
    BlockCacheModule,
  ],
  controllers: [HealthController],
  providers: [ConfigService, BlockAnalyticsCacheService, BlockStatsService],
})
export class HealthModule {}
