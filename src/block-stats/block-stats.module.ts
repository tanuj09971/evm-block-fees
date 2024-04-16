import { Module } from '@nestjs/common';
import { EthersModule } from '../ethers/ethers.module';
import { BlockStatsService } from './block-stats.service';

@Module({
  imports: [EthersModule],
  providers: [BlockStatsService],
})
export class BlockStatsModule {}
