import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockAnalyticsCacheService } from '../block-analytics-cache/block-analytics-cache.service';
import { BlockStat } from '../types/ethers';

@Injectable()
export class BlockFeesService {
  blockRange: Array<number>;
  constructor(
    private blockAnalyticsCacheService: BlockAnalyticsCacheService,
    private readonly configService: ConfigService,
    private logger: Logger = new Logger(BlockFeesService.name),
  ) {
    this.blockRange = JSON.parse(this.configService.getOrThrow('BLOCK_RANGE'));
  }

  async calculateFeeEstimate(): Promise<BlockStat[]> {
    try {
      this.logger.log(
        'TCL: BlockFeesService -> this.blockRange',
        this.blockRange,
      );
      const promises = this.blockRange.map(async (blocks: number) => {
        return this.blockAnalyticsCacheService.getStatsForLatestNBlocks(blocks);
      });
      return Promise.all(promises);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
