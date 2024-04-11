import { Test, TestingModule } from '@nestjs/testing';
import { BlockStatsService } from './block-stats.service';
import { BlockCacheService } from '../block-cache/block-cache.service';
import { Ethers } from '../ethers/ethers';
import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { ConfigService } from '@nestjs/config';
import { AppConfigModule } from '../config/config.module';
import { constants } from 'ethers';
import { BlockFeeData, BlockStat, Unit } from '../types/ethers';

describe('BlockStatsService', () => {
  let blockStatService: BlockStatsService;
  let ethersProvider: Ethers;
  const mockBlockNumber = 19625447;
  let mockBlockWithTransactions: BlockWithTransactions;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppConfigModule],
      providers: [BlockStatsService, Ethers, ConfigService],
    }).compile();

    blockStatService = module.get<BlockStatsService>(BlockStatsService);
    ethersProvider = module.get<Ethers>(Ethers);
    mockBlockWithTransactions =
      await ethersProvider.getBlockWithTransactionsByNumber(mockBlockNumber);
  });

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
        filteredTxs[0].data == '0x' && filteredTxs[0].value.gt(0);

      expect(conditionCheck).toBe(true);
    }, 15000);
  });

  describe('filterNonContractTransfers', () => {
    it('should filter the non contract transfers from block transactions', async () => {
      const filteredTxs = await blockStatService['filterNonContractTransfers'](
        mockBlockWithTransactions.transactions,
      );

      const bytecode = filteredTxs[0].to
        ? await ethersProvider.getBytecode(filteredTxs[0].to)
        : constants.AddressZero;
      const conditionCheck = bytecode.length === 2;
      expect(conditionCheck).toBe(true);
    }, 30000);
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
    });
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
