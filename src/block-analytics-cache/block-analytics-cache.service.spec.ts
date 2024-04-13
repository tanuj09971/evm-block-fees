import { Test, TestingModule } from '@nestjs/testing';
import { BlockAnalyticsCacheService } from './block-analytics-cache.service';
import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { Ethers } from '../ethers/ethers';
import { BlockCacheService } from '../block-cache/block-cache.service';
import { BlockStatsService } from '../block-stats/block-stats.service';
import { ConfigService } from '@nestjs/config';
import { AppConfigModule } from '../config/config.module';
import { BlockStat } from '../types/ethers';
import { ServiceUnavailableException } from '@nestjs/common';

describe('BlockAnalyticsCacheService', () => {
  let blockAnalyticsCacheService: BlockAnalyticsCacheService;
  const mockBlockNumber = 19609637;
  let ethersProvider: Ethers;
  let configService: ConfigService;
  let blockCacheService: BlockCacheService;
  let blockStatsService: BlockStatsService;
  let mockBlockWithTransactions: BlockWithTransactions;
  let mockStatsForLatestNBlocks: BlockStat;

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
    mockBlockWithTransactions =
      await ethersProvider.getBlockWithTransactionsByNumber(mockBlockNumber);

    blockCacheService['blockCache'].set(
      mockBlockNumber,
      mockBlockWithTransactions,
      {
        ttl: mockBlockWithTransactions.timestamp,
      },
    );
    await blockAnalyticsCacheService['updateStatsCache']();
    mockStatsForLatestNBlocks = await blockStatsService['calculateStats']([
      mockBlockWithTransactions,
    ]);
  }, 30000);

  afterEach(async () => {
    await ethersProvider['disposeCurrentProvider']();
  });

  it('should be defined', () => {
    expect(blockAnalyticsCacheService).toBeDefined();
  });

  describe('updateStatsCache', () => {
    it('should update stats in cache for the latest N blocks', async () => {
      const N = 1;

      expect(
        blockAnalyticsCacheService['statsCache'].get(N)
          ?.averageFeePerBlockInRange,
      ).toEqual(mockStatsForLatestNBlocks.averageFeePerBlockInRange);
    });
  });

  describe('getStatsForLatestNBlocks', () => {
    it('should return the stats for latest N blocks', async () => {
      const N = 1;
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
