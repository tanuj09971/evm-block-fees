import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { BlockAnalyticsModule } from './block-analytics/block-analytics.module';
import { BlockCacheModule } from './block-cache/block-cache.module';
import { BlockStatsModule } from './block-stats/block-stats.module';
import { AppConfigModule } from './config/config.module';
import { ethersProvider } from './providers/ethers.provider';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRoot([
      {
        ttl: 1000,
        limit: 10,
      },
    ]),
    CacheModule.register({
      ttl: 5000,
      isGlobal: true,
    }),
    BlockCacheModule,
    BlockAnalyticsModule,
    BlockStatsModule,
  ],
  controllers: [],
  providers: [ethersProvider.useFactory()],
})
export class AppModule {}
