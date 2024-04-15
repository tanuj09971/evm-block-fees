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
import { Logger } from '@nestjs/common';
import { BlockStat } from './dto/block-stat.dto';

describe('BlockFeesController', () => {
  let controller: BlockFeesController;
  let configService: ConfigService;
  let blockAnalyticsCacheService: BlockAnalyticsCacheService;
  let blockFeesService: BlockFeesService;
  let mockResponse: BlockStat[];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AppConfigModule,
        ThrottlerModule.forRoot([
          {
            ttl: 1000,
            limit: 10,
          },
        ]),
        CacheModule.register({
          ttl: 1000,
          isGlobal: true,
        }),
      ],
      controllers: [BlockFeesController],
      providers: [
        ConfigService,
        BlockFeesService,
        BlockStatsService,
        BlockAnalyticsCacheService,
        BlockCacheService,
        Ethers,
        Logger
      ],
    }).compile();

    controller = module.get<BlockFeesController>(BlockFeesController);
    blockFeesService = module.get<BlockFeesService>(BlockFeesService);
    blockAnalyticsCacheService = module.get<BlockAnalyticsCacheService>(
      BlockAnalyticsCacheService,
    );
    configService = module.get<ConfigService>(ConfigService);
    blockFeesService.blockRange = [1];
    mockResponse = [
      {
        averageFeePerBlockInRange: '30446674301',
        fromBlockNumber: 19625447,
        toBlockNumber: 19625447,
        totalBlocks: 1,
        unit: 'wei',
      },
    ];
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFeeEstimate', () => {
    it('should return the block stat response', async () => {
      blockFeesService.blockRange.forEach((block) => {
        blockAnalyticsCacheService['statsCache'].set(block, mockResponse[0]);
      });
      const response = await controller.getFeeEstimate();
      expect(response).toEqual(mockResponse);
    });
  });
});
