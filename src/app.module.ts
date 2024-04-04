import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { BlockCacheModule } from './block-cache/block-cache.module';
import { BlockStatsModule } from './block-stats/block-stats.module';
import { AppConfigModule } from './config/config.module';
import { Ethers } from './ethers/ethers';
import { BlockAnalyticsCacheModule } from './block-analytics-cache/block-analytics-cache.module';

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
    BlockStatsModule,
    BlockAnalyticsCacheModule,
  ],
  controllers: [],
  providers: [Ethers],
})
export class AppModule {}
