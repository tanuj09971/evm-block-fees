import {
  BlockWithTransactions,
  TransactionResponse,
} from '@ethersproject/abstract-provider';
import { Injectable, Logger } from '@nestjs/common';
import { BigNumber, constants } from 'ethers';
import { Ethers } from '../ethers/ethers';
import { BlockFeeData, Range, Unit } from '../types/ethers';
import { BlockStat } from '../block-fees/dto/block-stat.dto';

@Injectable()
export class BlockStatsService {
  private logger: Logger = new Logger(BlockStatsService.name);
  constructor(private ethersProvider: Ethers) {}

  async calculateStats(blocks: BlockWithTransactions[]): Promise<BlockStat> {
    const blockFeeData = await this.calculateBlockEthTransactionFeeData(blocks);
    // Average native ETH transfer fees calculation
    const avgNativeEthTransferFee =
      this.calculateAverageNativeEthTransferFee(blockFeeData);
    const blocksRange = this.getBlockRange(blocks);

    return {
      averageFeePerBlockInRange: avgNativeEthTransferFee.toString(),
      fromBlockNumber: blocksRange.from,
      toBlockNumber: blocksRange.to,
      totalBlocks: blocksRange.total,
      unit: Unit.Wei,
    };
  }

  // Filter out non-contract transactions
  private async filterNonContractTransfers(
    transactions: TransactionResponse[],
  ): Promise<TransactionResponse[]> {
    //Fetch bytecodes in parallel
    const bytecodePromises = transactions.map(async (tx) => {
      if (tx.to) {
        const byteCode = await this.ethersProvider.getBytecode(tx.to);
        return { tx, bytecode: byteCode };
      } else {
        return { tx, bytecode: null }; // Assuming all transactions have 'to' field
      }
    });

    //Wait for bytecode fetches to complete
    const results = await Promise.all(bytecodePromises);

    //Filter transactions based on bytecode
    return results
      .filter(({ bytecode }) => this.isNonContractTransfer(bytecode))
      .map(({ tx }) => tx);
  }

  private isNonContractTransfer(code: string | null): boolean {
    // Handle potential null bytecode
    return code !== null && code === '0x';
  }

  // Filter out non-native ETH transfer from transactions
  private async filterNativeEthTransfers(
    transactions: TransactionResponse[],
  ): Promise<TransactionResponse[]> {
    const filteredTxs = await this.filterNonContractTransfers(transactions);
    return filteredTxs.filter((tx) => tx.value.gt(0) && tx.data === '0x');
  }

  // Calculate total fees per block
  private async calculateBlockEthTransactionFeeData(
    blocks: BlockWithTransactions[],
  ): Promise<BlockFeeData[]> {
    const blockFeeData: BlockFeeData[] = [];
    for (const block of blocks) {
      this.logger.debug(`Filtering transactions of block ${block.number}`);
      const nativeEthTxs = await this.filterNativeEthTransfers(
        block.transactions,
      );
      const averageMaxPriorityFee =
        this.calculateAverageMaxPriorityFee(nativeEthTxs);

      this.logger.debug(`Calculating stats for block ${block.number}`);
      blockFeeData.push({
        baseFee: block.baseFeePerGas || constants.Zero,
        averagePriorityFee: averageMaxPriorityFee,
      });
    }
    return blockFeeData;
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
    const totalMaxPriorityFees =
      this.calculateTotalMaxPriorityFee(transactions);

    // Avoid division by zero
    if (txCount === 0) {
      return constants.Zero; // Or a default value that makes sense in your context
    }

    return totalMaxPriorityFees.div(txCount);
  }

  private calculateTotalMaxPriorityFee(transactions: TransactionResponse[]) {
    return transactions.reduce((priorityFee: BigNumber, tx) => {
      return tx.maxPriorityFeePerGas
        ? tx.maxPriorityFeePerGas.add(priorityFee)
        : constants.Zero;
    }, constants.Zero);
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
}
