import { Test, TestingModule } from '@nestjs/testing';
import { BlockFeesController } from './block-fees.controller';
import { BlockFeesService } from './block-fees.service';
import { BlockAnalyticsCacheService } from '../block-analytics-cache/block-analytics-cache.service';
import { ConfigService } from '@nestjs/config';
import { AppConfigModule } from '../config/config.module';
import { BlockCacheService } from '../block-cache/block-cache.service';
import { Ethers } from '../ethers/ethers';
import { BlockStatsService } from '../block-stats/block-stats.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import {
  HttpException,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BlockStats } from './dto/block-stats.dto';
import { BlockCacheModule } from '../block-cache/block-cache.module';

describe('BlockFeesController', () => {
  let controller: BlockFeesController;
  let configService: ConfigService;
  let blockAnalyticsCacheService: BlockAnalyticsCacheService;
  let blockFeesService: BlockFeesService;
  let mockResponse: BlockStats[];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AppConfigModule,
        CacheModule.register({
          ttl: 1000,
          isGlobal: true,
        }),
        BlockCacheModule,
      ],
      controllers: [BlockFeesController],
      providers: [
        ConfigService,
        BlockFeesService,
        BlockStatsService,
        BlockAnalyticsCacheService,
        Logger,
      ],
    }).compile();

    controller = module.get<BlockFeesController>(BlockFeesController);
    blockFeesService = module.get<BlockFeesService>(BlockFeesService);
    blockAnalyticsCacheService = module.get<BlockAnalyticsCacheService>(
      BlockAnalyticsCacheService,
    );
    configService = module.get<ConfigService>(ConfigService);
    mockResponse = [
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
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFeeEstimate', () => {
    it('should return the block stat response', async () => {
      blockFeesService.blockRange.map((block, i) => {
        blockAnalyticsCacheService['statsCache'].set(block, mockResponse[i]);
      });
      const response = controller.getFeeEstimate();
      expect(response).toEqual(mockResponse);
    });
  });
});
