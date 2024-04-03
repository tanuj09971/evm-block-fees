import { Module } from '@nestjs/common';
import { BlockStatsService } from './block-stats.service';

@Module({
  providers: [BlockStatsService]
})
export class BlockStatsModule {}
