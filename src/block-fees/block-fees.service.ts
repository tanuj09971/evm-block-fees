import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockAnalyticsCacheService } from '../block-analytics-cache/block-analytics-cache.service';
import { BlockStat } from './dto/block-stat.dto';

@Injectable()
export class BlockFeesService {
  blockRange: Array<number>;
  constructor(
    private blockAnalyticsCacheService: BlockAnalyticsCacheService,
    private readonly configService: ConfigService,
    private readonly logger: Logger = new Logger(BlockFeesService.name),
  ) {
    this.blockRange = JSON.parse(this.configService.getOrThrow('BLOCK_RANGE'));
  }

  /**
   * Calculates fee estimates for various block ranges, retrieving the
   * required data from the BlockAnalyticsCacheService.
   * @returns An array of BlockStat objects, each representing the
   * fee estimate for a configured block range.
   */
  calculateFeeEstimate(): BlockStat[] {
    try {
      // Iterate over block ranges to calculate fee estimates for each range
      const feeEstimates: BlockStat[] = this.blockRange.map((blocks: number) =>
        this.blockAnalyticsCacheService.getStatsForLatestNBlocks(blocks),
      );
      return feeEstimates;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
