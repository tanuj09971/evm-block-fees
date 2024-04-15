import { Test, TestingModule } from '@nestjs/testing';
import { BlockFeesService } from './block-fees.service';
import { ConfigService } from '@nestjs/config';
import { AppConfigModule } from '../config/config.module';
import { BlockAnalyticsCacheService } from '../block-analytics-cache/block-analytics-cache.service';
import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { Ethers } from '../ethers/ethers';
import { BlockCacheService } from '../block-cache/block-cache.service';
import { BlockStatsService } from '../block-stats/block-stats.service';
import { Logger } from '@nestjs/common';
import { BlockStat } from './dto/block-stat.dto';

describe('BlockFeesService', () => {
  let blockFeesService: BlockFeesService;
  let configService: ConfigService;
  let blockAnalyticsCacheService: BlockAnalyticsCacheService;
  let ethersProvider: Ethers;
  const mockBlockNumber = 19625447;
  let mockBlockWithTransactions: BlockWithTransactions;
  let mockBlockStat: BlockStat[];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppConfigModule],
      providers: [
        BlockFeesService,
        ConfigService,
        BlockAnalyticsCacheService,
        BlockCacheService,
        BlockStatsService,
        Ethers,
        Logger,
      ],
    }).compile();

    blockFeesService = module.get<BlockFeesService>(BlockFeesService);
    ethersProvider = module.get<Ethers>(Ethers);
    blockAnalyticsCacheService = module.get<BlockAnalyticsCacheService>(
      BlockAnalyticsCacheService,
    );
    configService = module.get<ConfigService>(ConfigService);
    mockBlockWithTransactions =
      await ethersProvider.getBlockWithTransactionsByNumber(mockBlockNumber);
    blockFeesService.blockRange = [1];
    mockBlockStat = [
      {
        averageFeePerBlockInRange: '30446674301',
        fromBlockNumber: 19625447,
        toBlockNumber: 19625447,
        totalBlocks: 1,
        unit: 'wei',
      },
    ];
  },15000);

  afterEach(async () => {
    await ethersProvider['disposeCurrentProvider']();
  });

  it('should be defined', () => {
    expect(blockFeesService).toBeDefined();
  });

  //Need to complete this once my quota is refilled
  describe('calculateFeeEstimate', () => {
    it('should return the stats within the block range', async () => {
      blockFeesService.blockRange.forEach((block) => {
        blockAnalyticsCacheService['statsCache'].set(block, mockBlockStat[0]);
      });
      const blocksStat = await blockFeesService.calculateFeeEstimate();
      expect(blocksStat).toEqual(mockBlockStat);
    });
  });
});
