import { Module } from '@nestjs/common';
import { BlockAnalyticsService } from './block-analytics.service';

@Module({
  providers: [BlockAnalyticsService]
})
export class BlockAnalyticsModule {}
