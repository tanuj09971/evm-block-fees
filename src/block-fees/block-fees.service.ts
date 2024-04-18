import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockAnalyticsCacheService } from '../block-analytics-cache/block-analytics-cache.service';
import { BlockStats } from './dto/block-stats.dto';

@Injectable()
export class BlockFeesService {
  blockRange: Array<number>;
  constructor(
    private blockAnalyticsCacheService: BlockAnalyticsCacheService,
    private readonly configService: ConfigService,
    private readonly logger: Logger = new Logger(BlockFeesService.name),
  ) {
    this.blockRange = this.configService.getOrThrow('BLOCK_LOOKBACK_ARRAY');
  }

  /**
   * Calculates fee estimates for various block ranges, retrieving the
   * required data from the BlockAnalyticsCacheService.
   * @returns An array of BlockStats objects, each representing the
   * fee estimate for a configured block range.
   */
  calculateFeeEstimate(): BlockStats[] {
    try {
      // Iterate over block ranges to calculate fee estimates for each range
      const feeEstimates: BlockStats[] = this.blockRange.map((blocks: number) =>
        this.blockAnalyticsCacheService.getStatsForLatestNBlocks(blocks),
      );
      return feeEstimates;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
