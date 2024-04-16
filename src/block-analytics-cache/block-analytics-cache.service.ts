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
import { BlockStatsService } from '../block-stats/block-stats.service';
import { BlockStat } from '../block-fees/dto/block-stat.dto';

@Injectable()
export class BlockAnalyticsCacheService implements OnModuleInit {
  private statsCache: Map<number, BlockStat> = new Map(); // Key: number of blocks, Value: stats
  private readonly statsForNBlocks: Array<number>;
  private logger: Logger = new Logger(BlockAnalyticsCacheService.name);
  private newBlockWithTransactionObservable: Observable<BlockWithTransactions>;
  private previousBlockNumber: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly blockCacheService: BlockCacheService,
    private blockStatService: BlockStatsService,
  ) {
    this.statsForNBlocks = JSON.parse(
      this.configService.getOrThrow('BLOCK_RANGE'),
    );
  }

  async onModuleInit() {
    this.newBlockWithTransactionObservable =
      this.blockCacheService.getBlockAppendedObservable();

    this.newBlockWithTransactionObservable.subscribe({
      next: async (block: BlockWithTransactions) => {
        this.logger.debug(
          `Block received in BlockAnalyticsCacheService: ${block.number}`,
        );
        if (this.previousBlockNumber !== block.number) {
          await this.updateStatsCache();
        } else {
          this.logger.error(
            `Skipping stats cache update for block ${block.number}`,
          );
        }
      },
      error: (error) => {
        this.logger.error(error);
        throw error; // Re-throw for potential handling at a higher level
      },
    });
  }

  getStatsForLatestNBlocks(n: number): BlockStat {
    if (this.isStatsCacheEmpty() || !this.isStatsCacheUpdated())
      throw new ServiceUnavailableException();
    return this.statsCache.get(n) as BlockStat;
  }

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

  private isStatsCacheUpdated(): boolean {
    return this.statsCache.size === this.statsForNBlocks.length;
  }

  private isStatsCacheEmpty(): boolean {
    return this.statsCache.size === 0;
  }
}
