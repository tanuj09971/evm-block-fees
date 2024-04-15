import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { BlockCacheService } from '../block-cache/block-cache.service';
import { BlockStatsService } from '../block-stats/block-stats.service';
import { AppConfigModule } from '../config/config.module';
import { Ethers } from '../ethers/ethers';
import { BlockAnalyticsCacheService } from './block-analytics-cache.service';
import { BlockStat } from '../block-fees/dto/block-stat.dto';

describe('BlockAnalyticsCacheService', () => {
  let blockAnalyticsCacheService: BlockAnalyticsCacheService;
  const mockBlockNumber = 19609637;
  let ethersProvider: Ethers;
  let configService: ConfigService;
  let blockCacheService: BlockCacheService;
  let blockStatsService: BlockStatsService;
  let mockStatsForLatestNBlocks: BlockStat;
  const N = 5;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppConfigModule],
      providers: [
        BlockAnalyticsCacheService,
        BlockCacheService,
        BlockStatsService,
        Ethers,
        ConfigService,
      ],
    }).compile();

    blockAnalyticsCacheService = module.get<BlockAnalyticsCacheService>(
      BlockAnalyticsCacheService,
    );
    blockCacheService = module.get<BlockCacheService>(BlockCacheService);
    configService = module.get<ConfigService>(ConfigService);
    blockStatsService = module.get<BlockStatsService>(BlockStatsService);
    ethersProvider = module.get<Ethers>(Ethers);

    let blockWithTransactionsArray = [];
    for (let i = mockBlockNumber - N - 1; i <= mockBlockNumber; i++) {
      const blockWithTransactions =
        await ethersProvider.getBlockWithTransactionsByNumber(i);

      blockCacheService['blockCache'].set(i, blockWithTransactions, {
        ttl: blockWithTransactions.timestamp,
      });
      blockWithTransactionsArray.push(blockWithTransactions);
    }
    mockStatsForLatestNBlocks = await blockStatsService['calculateStats'](
      blockWithTransactionsArray,
    );

    await blockAnalyticsCacheService['updateStatsCache']();
  }, 30 * 1000);

  afterEach(async () => {
    await ethersProvider['disposeCurrentProvider']();
  });

  it('should be defined', () => {
    expect(blockAnalyticsCacheService).toBeDefined();
  });

  describe('updateStatsCache', () => {
    it('should update stats in cache for the latest N blocks', async () => {
      expect(
        blockAnalyticsCacheService['statsCache'].get(N)
          ?.averageFeePerBlockInRange,
      ).toEqual(mockStatsForLatestNBlocks.averageFeePerBlockInRange);
    });
  });

  describe('getStatsForLatestNBlocks', () => {
    it('should return the stats for latest N blocks', async () => {
      const latestStats =
        blockAnalyticsCacheService.getStatsForLatestNBlocks(N);

      expect(latestStats.averageFeePerBlockInRange).toEqual(
        mockStatsForLatestNBlocks.averageFeePerBlockInRange,
      );
    });
    it('should throw service unavailable exception', async () => {
      blockAnalyticsCacheService['statsCache'].clear();
      const N = 2;
      let errorMessage;
      try {
        const latestStats =
          blockAnalyticsCacheService.getStatsForLatestNBlocks(N);
      } catch (error) {
        errorMessage = error;
      }
      expect(errorMessage).toEqual(new ServiceUnavailableException());
    });
  });
});
