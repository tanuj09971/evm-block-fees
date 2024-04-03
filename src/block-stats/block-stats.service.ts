import { Injectable } from '@nestjs/common';
import { BlockWithTransactions } from '@ethersproject/abstract-provider';

interface Transfer {
  value: string; // Assuming transaction value represents the amount of ETH transferred
}

interface BlockStat {
  avgNativeEthTransferFee: number;
  optimalFee: number; // Placeholder for future implementation
  // Difficulty to estimate mempool size accurately; omit for now
  // mempoolSize: number,
  blockFullness: number; // (0 - 100 representing percentage full)
}

@Injectable()
export class BlockStatsService {
  calculateStats(blocks: BlockWithTransactions[]): BlockStat {
    const filteredBlocks = this.filterNativeEthTransfers(blocks);

    // 1. Average native ETH transfer fees calculation
    const avgNativeEthTransferFee = this.calculateAverageNativeEthTransferFee(filteredBlocks);

    // 2. Placeholder for more complex optimal fee calculation (to be implemented later)
    const optimalFee = 0; // Assuming we don't have enough data for this yet

    // 3. Block fullness calculation
    const averageBlockFullness = this.calculateAverageBlockFullness(blocks);

    return {
      avgNativeEthTransferFee,
      optimalFee,
      // mempoolSize: 0, // Omit for now
      blockFullness: averageBlockFullness,
    };
  }

  // Filter out non-native ETH transfer transactions
  private filterNativeEthTransfers(blocks: BlockWithTransactions[]): BlockWithTransactions[] {
    return blocks.flatMap((block) =>
      block.transactions.filter((tx) => !!tx.value) // Assuming 'value' indicates ETH transfer
    );
  }

  private calculateAverageNativeEthTransferFee(blocks: BlockWithTransactions[]): number {
    let totalFees = BigInt(0);
    let transferCount = 0;

    for (const block of blocks) {
      for (const tx of block.transactions) {
        if (tx.value) {
          totalFees += BigInt(tx.value);
          transferCount++;
        }
      }
    }

    return transferCount > 0 ? Number(totalFees / BigInt(transferCount)) : 0;
  }

  private calculateAverageBlockFullness(blocks: BlockWithTransactions[]): number {
    const totalGasUsed = blocks.reduce((sum, block) => sum + block.gasUsed, 0);
    const averageBlockGasLimit = blocks.length > 0 ? Math.floor(totalGasUsed / blocks.length) : 0;

    // Assuming block.gasLimit represents the maximum gas allowed per block
    return averageBlockGasLimit > 0 ? (totalGasUsed / BigInt(averageBlockGasLimit)) * 100 : 0;
  }
}