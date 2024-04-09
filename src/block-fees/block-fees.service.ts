import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockAnalyticsCacheService } from '../block-analytics-cache/block-analytics-cache.service';
import { BlockStat } from '../types/ethers';

@Injectable()
export class BlockFeesService {
  constructor(
    private blockAnalyticsCacheService: BlockAnalyticsCacheService,
    private readonly configService: ConfigService,
  ) {}

  async calculateFeeEstimate(): Promise<BlockStat[]> {
    const blockRange =
      this.configService.getOrThrow<Array<number>>('block_range');
    const promises = blockRange.map(async (blocks: number) => {
      return this.blockAnalyticsCacheService.getStatsForLatestNBlocks(
        blocks,
      );
    });
    return Promise.all(promises);
  }
}
