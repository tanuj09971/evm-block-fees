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
import { BlockStat } from '../types/ethers';

@Injectable()
export class BlockAnalyticsCacheService implements OnModuleInit {
  private statsCache: Map<number, BlockStat> = new Map(); // Key: number of blocks, Value: stats
  private readonly statsForNBlocks: Array<number>;
  private logger: Logger = new Logger(BlockAnalyticsCacheService.name);
  private newBlockWithTransactionObservable: Observable<BlockWithTransactions>;

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

    this.newBlockWithTransactionObservable.subscribe(
      async (block: BlockWithTransactions) => {
        this.logger.debug(
          `Block received in BlockAnalyticsCacheService: ${block.number}`,
        );
        try {
          await this.updateStatsCache();
        } catch (error) {
          this.logger.error(`Error updating stats cache: ${error.message}`); // Log errors
        }
      },
    );
  }

  getStatsForLatestNBlocks(n: number): BlockStat {
    if (this.isStatsCacheEmpty()) throw new ServiceUnavailableException();
    return this.statsCache.get(n) as BlockStat;
  }

  private async updateStatsCache(): Promise<void> {
    // Calculate stats for relevant ranges (1, 5, ... 30)
    this.logger.debug('Starting stats cache update');
    for (const n of this.statsForNBlocks) {
      const latestNBlocks = this.blockCacheService.getLatestNBlocks(n);
      try {
        const statsForLatestNBlocks =
          await this.blockStatService.calculateStats(latestNBlocks);

        this.statsCache.set(n, statsForLatestNBlocks); // Update cache
      } catch (error) {
        this.logger.error(
          `Error calculating stats for ${n} blocks: ${error.message}`,
        );
      }
    }
  }

  private isStatsCacheEmpty(): boolean {
    return this.statsCache.size === 0;
  }
}
