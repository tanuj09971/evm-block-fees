import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { Test, TestingModule } from '@nestjs/testing';
import { constants } from 'ethers';
import { BlockCacheModule } from '../block-cache/block-cache.module';
import { BlockStat } from '../block-fees/dto/block-stat.dto';
import { AppConfigModule } from '../config/config.module';
import { Ethers } from '../ethers/ethers';
import { BlockFeeData, Unit } from '../types/ethers';
import { BlockStatsService } from './block-stats.service';
import { ConfigService } from '@nestjs/config';
import { config } from 'process';

describe('BlockStatsService', () => {
  let blockStatService: BlockStatsService;
  let ethersProvider: Ethers;
  const mockBlockNumber = 19625447;
  let mockBlockWithTransactions: BlockWithTransactions;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppConfigModule, BlockCacheModule],
      providers: [BlockStatsService, ConfigService],
    }).compile();

    blockStatService = module.get<BlockStatsService>(BlockStatsService);
    configService = module.get<ConfigService>(ConfigService);
    const wssUrl = configService.getOrThrow<string>('WSS_WEB3_URL');
    ethersProvider = module.get<Ethers>(Ethers);

    ethersProvider['ethersWebsocketProvider'] =
      await ethersProvider['establishWebsocketConnectionWithRetries'](wssUrl);
    mockBlockWithTransactions =
      await ethersProvider.getBlockWithTransactionsByNumber(mockBlockNumber);
  }, 15000);

  it('should be defined', () => {
    expect(blockStatService).toBeDefined();
  });

  afterEach(async () => {
    await ethersProvider['disposeCurrentProvider']();
  });

  describe('filterNativeEthTransfers', () => {
    it('should filter the eth native transfers from block transactions', async () => {
      const filteredTxs = await blockStatService['filterNativeEthTransfers'](
        mockBlockWithTransactions.transactions,
      );
      const conditionCheck =
        filteredTxs[0].data === '0x' && filteredTxs[0].value.gt(0);

      expect(conditionCheck).toBe(true);
    }, 30000);
  });

  describe('filterNonContractTransfers', () => {
    it('should filter the non contract transfers from block transactions', async () => {
      const filteredTxs = await blockStatService['filterNonContractTransfers'](
        mockBlockWithTransactions.transactions,
      );

      const bytecode = filteredTxs[0].to
        ? await ethersProvider.getBytecode(filteredTxs[0].to)
        : '0x';
      const conditionCheck = bytecode === null || bytecode === '0x';
      expect(conditionCheck).toBe(true);
    }, 10000);
  });

  describe('calculateAverageMaxPriorityFee', () => {
    it('should return average priority fee', async () => {
      const filteredTxs = await blockStatService['filterNativeEthTransfers'](
        mockBlockWithTransactions.transactions,
      );
      const averagePriorityFee =
        blockStatService['calculateAverageMaxPriorityFee'](filteredTxs);
      const totalMaxPriorityFees =
        blockStatService['calculateTotalMaxPriorityFee'](filteredTxs);
      expect(averagePriorityFee).toEqual(
        totalMaxPriorityFees.div(filteredTxs.length),
      );
    }, 30000);
  });

  describe('calculateBlockEthTransactionTotalFeeData', () => {
    it('should return BlockFee data', async () => {
      const blockFeeData: BlockFeeData[] = await blockStatService[
        'calculateBlockEthTransactionFeeData'
      ]([mockBlockWithTransactions]);

      const nativeEthTxs = await blockStatService['filterNativeEthTransfers'](
        mockBlockWithTransactions.transactions,
      );

      const averageMaxPriorityFee =
        blockStatService['calculateAverageMaxPriorityFee'](nativeEthTxs);

      const mockBlockFeeData: BlockFeeData[] = [
        {
          baseFee: mockBlockWithTransactions.baseFeePerGas || constants.Zero,
          averagePriorityFee: averageMaxPriorityFee,
        },
      ];

      expect(mockBlockFeeData[0].averagePriorityFee).toEqual(
        blockFeeData[0].averagePriorityFee,
      );
    }, 30000);
  });

  describe('getBlockRange', () => {
    it('should return the range metrics of the blocks', async () => {
      const blockRange = blockStatService['getBlockRange']([
        mockBlockWithTransactions,
      ]);
      expect(blockRange.from).toEqual(mockBlockNumber);
    });
  });

  describe('calculateStats', () => {
    it('should calculate the block stats', async () => {
      const blockStat: BlockStat = await blockStatService.calculateStats([
        mockBlockWithTransactions,
      ]);

      const mockFeeData = await blockStatService[
        'calculateBlockEthTransactionFeeData'
      ]([mockBlockWithTransactions]);
      const mockAvgNativeEthTransferFee =
        blockStatService['calculateAverageNativeEthTransferFee'](mockFeeData);
      const mockRange = blockStatService['getBlockRange']([
        mockBlockWithTransactions,
      ]);

      const mockStat: BlockStat = {
        averageFeePerBlockInRange: mockAvgNativeEthTransferFee.toString(),
        fromBlockNumber: mockRange.from,
        toBlockNumber: mockRange.to,
        totalBlocks: mockRange.total,
        unit: Unit.Wei,
      };

      expect(blockStat).toStrictEqual(mockStat);
    }, 30000);
  });
});
