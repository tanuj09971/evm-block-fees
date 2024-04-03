import { Module } from '@nestjs/common';
import { BlockCacheService } from './block-cache/block-cache.service';
import { ethersProvider } from './providers/ethers.provider';
import { BlockCacheModule } from './block-cache/block-cache.module';
import { BlockAnalyticsModule } from './block-analytics/block-analytics.module';
import { BlockStatsModule } from './block-stats/block-stats.module';

@Module({
  imports: [BlockCacheModule, BlockAnalyticsModule, BlockStatsModule],
  controllers: [],
  providers: [BlockCacheService, ethersProvider],
})
export class AppModule {}
