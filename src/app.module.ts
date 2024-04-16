import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { BlockAnalyticsCacheModule } from './block-analytics-cache/block-analytics-cache.module';
import { BlockCacheModule } from './block-cache/block-cache.module';
import { BlockFeesModule } from './block-fees/block-fees.module';
import { BlockStatsModule } from './block-stats/block-stats.module';
import { AppConfigModule } from './config/config.module';
import { EthersModule } from './ethers/ethers.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    AppConfigModule,
    EthersModule,
    CacheModule.register({
      ttl: 1000,
      isGlobal: true,
    }),
    BlockFeesModule,
    BlockCacheModule,
    BlockAnalyticsCacheModule,
    BlockStatsModule,
    HealthModule,
  ],
})
export class AppModule {}
