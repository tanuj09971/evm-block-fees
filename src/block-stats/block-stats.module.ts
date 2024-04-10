import { Module } from '@nestjs/common';
import { BlockStatsService } from './block-stats.service';
import { Ethers } from '../ethers/ethers';

@Module({
  providers: [BlockStatsService, Ethers],
})
export class BlockStatsModule {}
