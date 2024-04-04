import { Injectable } from '@nestjs/common';
import {
  BlockWithTransactions,
  TransactionResponse,
} from '@ethersproject/abstract-provider';
import { BigNumber, constants } from 'ethers';

interface BlockStat {
  avgNativeEthTransferFee: BigNumber;
  optimalFee?: BigNumber; // Placeholder for future implementation
  // Difficulty to estimate mempool size accurately; omit for now
  // mempoolSize: BigNumber,
  blockFullness?: BigNumber; // (0 - 100 representing percentage full)
}

interface BlockFeeData {
  baseFee: BigNumber;
  averagePriorityFee: BigNumber; // Assuming BigNumber is appropriate for your use case
}

@Injectable()
export class BlockStatsService {
  constructor() {}

  calculateStats(blocks: BlockWithTransactions[]): BlockStat {
    const blockFeeData = this.calculateBlockEthTransactionTotalFeeData(blocks);

    // 1. Average native ETH transfer fees calculation
    const avgNativeEthTransferFee =
      this.calculateAverageNativeEthTransferFee(blockFeeData);

    // 2. Placeholder for more complex optimal fee calculation (to be implemented later)
    // const optimalFee = 0; // Assuming we don't have enough data for this yet

    // 3. Block fullness calculation
    // const averageBlockFullness = this.calculateAverageBlockFullness(blocks);

    return {
      avgNativeEthTransferFee,
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

  private calculateAverageNativeEthTransferFee(
    blocks: BlockFeeData[],
  ): BigNumber {
    const totalBlockFee = blocks.reduce((totalFee, block) => {
      return totalFee.add(block.averagePriorityFee.add(block.baseFee));
    }, constants.Zero);
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
