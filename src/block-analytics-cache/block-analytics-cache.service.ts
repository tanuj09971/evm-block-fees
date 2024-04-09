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
  private readonly MAX_CACHE_SIZE: number;
  private logger: Logger = new Logger(BlockAnalyticsCacheService.name);
  private newBlockWithTransactionObservable: Observable<BlockWithTransactions>;

  constructor(
    private readonly blockCacheService: BlockCacheService,
    private blockStatService: BlockStatsService,
    private configService: ConfigService,
  ) {
    this.MAX_CACHE_SIZE =
      this.configService.getOrThrow<number>('max_cache_size');
    this.statsForNBlocks =
      this.configService.getOrThrow<Array<number>>('block_range');
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

      const statsForLatestNBlocks =
        await this.blockStatService.calculateStats(latestNBlocks); // Delegate calculation
      this.statsCache.set(n, statsForLatestNBlocks); // Update cache
    }
  }

  private isStatsCacheEmpty(): boolean {
    return this.statsCache.size === 0;
  }
}
