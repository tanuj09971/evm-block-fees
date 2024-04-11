import { Test, TestingModule } from '@nestjs/testing';
import { BlockFeesService } from './block-fees.service';
import { ConfigService } from '@nestjs/config';
import { AppConfigModule } from '../config/config.module';
import { BlockAnalyticsCacheService } from '../block-analytics-cache/block-analytics-cache.service';
import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { Ethers } from '../ethers/ethers';

describe('BlockFeesService', () => {
  let blockFeesService: BlockFeesService;
  let configService: ConfigService;
  let blockAnalyticsCacheService: BlockAnalyticsCacheService;
  let ethersProvider: Ethers;
  const mockBlockNumber = 19625447;
  let mockBlockWithTransactions: BlockWithTransactions;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppConfigModule],
      providers: [
        BlockFeesService,
        ConfigService,
        BlockAnalyticsCacheService,
        Ethers,
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
  });

  it('should be defined', () => {
    expect(blockFeesService).toBeDefined();
  });

  //Need to complete this once my quota is refilled
  describe('calculateFeeEstimate', () => {
    it('should return the stats within the block range', async () => {
      // blockFeesService.blockRange.map(block=>{
      //   blockAnalyticsCacheService['statsCache'].set(block, )

      // })
      // const blocksStat=
    });
  });
});
