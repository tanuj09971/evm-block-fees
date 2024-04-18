import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { BlockCacheService } from '../block-cache/block-cache.service';
import { BlockStats } from '../block-fees/dto/block-stats.dto';
import { BlockStatsService } from '../block-stats/block-stats.service';

@Injectable()
export class BlockAnalyticsCacheService implements OnModuleInit {
  private statsCache: Map<number, BlockStats> = new Map(); // Key: number of blocks, Value: stats
  private readonly statsForNBlocks: Array<number>;
  private logger: Logger = new Logger(BlockAnalyticsCacheService.name);
  private newBlockWithTransactionObservable: Observable<BlockWithTransactions>;
  private previousBlockNumber: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly blockCacheService: BlockCacheService,
    private blockStatService: BlockStatsService,
  ) {
    this.statsForNBlocks = this.configService.getOrThrow('BLOCK_LOOKBACK_ARRAY');
  }

  async onModuleInit() {
    this.newBlockWithTransactionObservable =
      this.blockCacheService.getBlockAppendedObservable();

    this.newBlockWithTransactionObservable.subscribe({
      next: async (block: BlockWithTransactions) => {
        // block processing logic
        if (this.shouldProcessBlockForStatsUpdate(block)) {
          this.logger.debug(
            `Block received in BlockAnalyticsCacheService: ${block.number}`,
          );
          this.previousBlockNumber = block.number;
          await this.updateStatsCache();
        } else {
          this.logger.error(`Skipping update for block ${block.number}`);
        }
      },
    });
  }

  /**
   * Determines if a new block warrants updating the analytics cache.
   * @param block - The new block received.
   * @returns `true` if the block should trigger an update, `false` otherwise.
   */
  private shouldProcessBlockForStatsUpdate(
    block: BlockWithTransactions,
  ): boolean {
    return !this.previousBlockNumber || this.previousBlockNumber < block.number;
  }

  /**
   * Retrieves analytics stats for the specified number of latest blocks.
   * @param n - The number of blocks for which to retrieve stats.
   * @returns The calculated block statistics.
   * @throws ServiceUnavailableException if the cache is empty or incomplete.
   */
  getStatsForLatestNBlocks(n: number): BlockStats {
    if (this.isStatsCacheEmpty() || !this.hasStatsForAllRanges())
      throw new ServiceUnavailableException();
    return this.statsCache.get(n) as BlockStats;
  }

  /**
   * Updates the analytics cache with stats for configured block ranges.
   * Fetches blocks from the block cache and calculates relevant statistics.
   */
  private async updateStatsCache(): Promise<void> {
    // Calculate stats for relevant ranges (1, 5, ... 30)
    this.logger.debug('Starting stats cache update');
    for (const n of this.statsForNBlocks) {
      const latestNBlocks = this.blockCacheService.getLatestNBlocks(n);
      const statsForLatestNBlocks =
        await this.blockStatService.calculateStats(latestNBlocks);
      this.logger.debug(
        `Stats calculated for ${n} blocks: ${JSON.stringify(
          statsForLatestNBlocks,
        )}`,
      );
      this.statsCache.set(n, statsForLatestNBlocks); // Update cache
      this.logger.debug(
        `Stats cache updated with ${n} blocks: ${JSON.stringify(
          this.statsCache.get(n),
        )}`,
      );
    }
  }

  /**
   * Checks if the analytics cache contains stats for all configured block ranges.
   * @returns `true` if the cache is complete, `false` otherwise.
   */
  private hasStatsForAllRanges(): boolean {
    return this.statsCache.size === this.statsForNBlocks.length;
  }

  /**
   * Checks if the analytics cache is empty.
   * @returns `true` if the cache has no entries, `false` otherwise.
   */
  private isStatsCacheEmpty(): boolean {
    return this.statsCache.size === 0;
  }
}
