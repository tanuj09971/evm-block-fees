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
import { BlockStats } from './dto/block-stats.dto';
import { BlockCacheModule } from '../block-cache/block-cache.module';

describe('BlockFeesService', () => {
  let blockFeesService: BlockFeesService;
  let configService: ConfigService;
  let blockAnalyticsCacheService: BlockAnalyticsCacheService;
  let ethersProvider: Ethers;
  const mockBlockNumber = 19625447;
  let mockBlockWithTransactions: BlockWithTransactions;
  let mockBlockStat: BlockStats[];
  let wssWeb3Url: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppConfigModule, BlockCacheModule],
      providers: [
        BlockFeesService,
        ConfigService,
        BlockAnalyticsCacheService,
        BlockStatsService,
        Logger,
      ],
    }).compile();

    blockFeesService = module.get<BlockFeesService>(BlockFeesService);
    ethersProvider = module.get<Ethers>(Ethers);
    blockAnalyticsCacheService = module.get<BlockAnalyticsCacheService>(
      BlockAnalyticsCacheService,
    );
    configService = module.get<ConfigService>(ConfigService);
    wssWeb3Url = configService.getOrThrow<string>('WSS_WEB3_URL');
    ethersProvider['ethersWebsocketProvider'] =
      await ethersProvider['establishWebsocketConnectionWithRetries'](
        wssWeb3Url,
      );
    mockBlockWithTransactions =
      await ethersProvider.getBlockWithTransactionsByNumber(mockBlockNumber);
    mockBlockStat = [
      {
        averageOnlyNativeEthTransferFee: '30446674334',
        fromBlockNumber: 19625447,
        toBlockNumber: 19625447,
        totalBlocks: 1,
        unit: 'wei',
      },
      {
        averageOnlyNativeEthTransferFee: '30446674320',
        fromBlockNumber: 19625447,
        toBlockNumber: 19625443,
        totalBlocks: 5,
        unit: 'wei',
      },
      {
        averageOnlyNativeEthTransferFee: '30446674300',
        fromBlockNumber: 19625447,
        toBlockNumber: 19625418,
        totalBlocks: 30,
        unit: 'wei',
      },
    ];
  }, 15000);

  afterEach(async () => {
    await ethersProvider['disposeCurrentProvider']();
  });

  it('should be defined', () => {
    expect(blockFeesService).toBeDefined();
  });

  //Need to complete this once my quota is refilled
  describe('calculateFeeEstimate', () => {
    it('should return the stats within the block range', async () => {
      blockFeesService.blockRange.map((block, i) => {
        blockAnalyticsCacheService['statsCache'].set(block, mockBlockStat[i]);
      });
      const blocksStat = blockFeesService.calculateFeeEstimate();
      expect(blocksStat).toEqual(mockBlockStat);
    });
  });
});
