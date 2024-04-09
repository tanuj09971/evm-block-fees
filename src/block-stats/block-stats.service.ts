import { Injectable, Logger } from '@nestjs/common';
import {
  BlockWithTransactions,
  TransactionResponse,
} from '@ethersproject/abstract-provider';
import { BigNumber, constants } from 'ethers';
import { BlockFeeData, BlockStat, Range, Unit } from '../types/ethers';

@Injectable()
export class BlockStatsService {
  private logger: Logger = new Logger(BlockStatsService.name);
  constructor() {}

  async calculateStats(blocks: BlockWithTransactions[]): Promise<BlockStat> {
    const blockFeeData = this.calculateBlockEthTransactionTotalFeeData(blocks);
    // 1. Average native ETH transfer fees calculation
    const avgNativeEthTransferFee =
      this.calculateAverageNativeEthTransferFee(blockFeeData);

    const blocksRange = this.getBlockRange(blocks);
    // 2. Placeholder for more complex optimal fee calculation (to be implemented later)
    // const optimalFee = 0; // Assuming we don't have enough data for this yet

    // 3. Block fullness calculation
    // const averageBlockFullness = this.calculateAverageBlockFullness(blocks);

    return {
      avgNativeEthTransferFee: avgNativeEthTransferFee.toString(),
      fromBlockNumber: blocksRange.from,
      toBlockNumber: blocksRange.to,
      totalBlocks: blocksRange.total,
      unit: Unit.Wei,
      // optimalFee,
      // mempoolSize: 0, // Omit for now
      // blockFullness: averageBlockFullness,
    };
  }

  // Filter out non-native ETH transfer transactions
  private filterNativeEthTransfers(
    transactions: TransactionResponse[],
  ): TransactionResponse[] {
    return transactions.filter((tx) => !!tx.value); // Assuming 'value' indicates ETH transfer
  }

  // Calculate total fees per block
  private calculateBlockEthTransactionTotalFeeData(
    blocks: BlockWithTransactions[],
  ): BlockFeeData[] {
    return blocks.map((block: BlockWithTransactions) => {
      const nativeEthTxs = this.filterNativeEthTransfers(block.transactions);
      const averageMaxPriorityFee =
        this.calculateAverageMaxPriorityFee(nativeEthTxs);

      return {
        baseFee: block.baseFeePerGas || constants.Zero,
        averagePriorityFee: averageMaxPriorityFee,
      };
    });
  }

  private getBlockRange(blocks: BlockWithTransactions[]): Range {
    const startBlock = blocks[0]?.number;
    const lastBlock = blocks[blocks.length - 1]?.number;
    const numberOfBlocks = lastBlock - startBlock + 1;
    return { from: startBlock, to: lastBlock, total: numberOfBlocks };
  }

  // Calculate average priority fee across transactions
  private calculateAverageMaxPriorityFee(
    transactions: TransactionResponse[],
  ): BigNumber {
    const txCount: number = transactions.length;
    const totalMaxPriorityFees = transactions.reduce(
      (priorityFee: BigNumber, tx) => {
        return tx.maxPriorityFeePerGas
          ? tx.maxPriorityFeePerGas.add(priorityFee)
          : constants.Zero;
      },
      constants.Zero,
    );

    // Avoid division by zero
    if (txCount === 0) {
      return constants.Zero; // Or a default value that makes sense in your context
    }

    return totalMaxPriorityFees.div(txCount);
  }

  // Calculate average native ETH transfer fee across blocks
  private calculateAverageNativeEthTransferFee(
    blocks: BlockFeeData[],
  ): BigNumber {
    const totalBlockFee = blocks.reduce((totalFee, block) => {
      return totalFee.add(block.averagePriorityFee.add(block.baseFee));
    }, constants.Zero);

    if (blocks.length === 0) {
      return constants.Zero;
    }

    return totalBlockFee.div(blocks.length);
  }

  // private calculateAverageBlockFullness(
  //   blocks: BlockWithTransactions[],
  // ): number {
  //   const totalGasUsed = blocks.reduce((sum, block) => sum + block.gasUsed, 0);
  //   const averageBlockGasLimit =
  //     blocks.length > 0 ? Math.floor(totalGasUsed / blocks.length) : 0;

  //   // Assuming block.gasLimit represents the maximum gas allowed per block
  //   return averageBlockGasLimit > 0
  //     ? (totalGasUsed / BigInt(averageBlockGasLimit)) * 100
  //     : 0;
  // }
}
