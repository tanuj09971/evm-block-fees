import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { BlockAnalyticsCacheModule } from './block-analytics-cache/block-analytics-cache.module';
import { BlockCacheModule } from './block-cache/block-cache.module';
import { BlockFeesModule } from './block-fees/block-fees.module';
import { BlockStatsModule } from './block-stats/block-stats.module';
import { AppConfigModule } from './config/config.module';
import { EthersModule } from './ethers/ethers.module';

@Module({
  imports: [
    AppConfigModule,
    EthersModule,
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
    BlockFeesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
