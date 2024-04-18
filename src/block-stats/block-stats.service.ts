import {
  BlockWithTransactions,
  TransactionResponse,
} from '@ethersproject/abstract-provider';
import { Injectable, Logger } from '@nestjs/common';
import { BigNumber, constants } from 'ethers';
import { Ethers } from '../ethers/ethers';
import { BlockFeeData, Range, Unit } from '../types/ethers';
import { BlockStats } from '../block-fees/dto/block-stats.dto';
import { NativeEthTransfer } from '../block-fees/dto/native-eth-transfer.dto';

@Injectable()
export class BlockStatsService {
  private logger: Logger = new Logger(BlockStatsService.name);
  constructor(private ethersProvider: Ethers) {}

  /**
   * Calculates aggregated block statistics, including average transaction fees,
   * over a specified range of blocks.
   * @param blocks - An array of BlockWithTransactions objects.
   * @returns BlockStats object containing calculated statistics.
   */
  async calculateStats(blocks: BlockWithTransactions[]): Promise<BlockStats> {
    const blockFeeData = await this.calculateBlockEthTransactionFeeData(blocks);

    // Average base fee and priority fee
    const avgBaseAndPriorityFee =
      this.calculateAvgBaseAndPriorityFee(blockFeeData);

    // Average native ETH transfer fees calculation
    const avgNativeEthTransferFee =
      this.calculateAverageNativeEthTransferFee(blockFeeData);
    const blocksRange = this.getBlockRange(blocks);

    const nativeEthTransfer: NativeEthTransfer = {
      averageFee: avgNativeEthTransferFee.toString(),
      unit: Unit.Wei,
      priorityFee: avgBaseAndPriorityFee.avgPriorityFee,
      baseFee: avgBaseAndPriorityFee.avgBaseFee,
    };

    return {
      nativeEthTransfer,
      fromBlockNumber: blocksRange.from,
      toBlockNumber: blocksRange.to,
      totalBlocks: blocksRange.total,
    };
  }

  private calculateAvgBaseAndPriorityFee(blockFeeData: BlockFeeData[]) {
    const totalBaseFee = blockFeeData.reduce(
      (totalBaseFee, fee) => totalBaseFee.add(fee.baseFee),
      constants.Zero,
    );
    const totalPriorityFee = blockFeeData.reduce(
      (totalPriorityFee, fee) => totalPriorityFee.add(fee.averagePriorityFee),
      constants.Zero,
    );
    const avgBaseFee = totalBaseFee.div(blockFeeData.length);
    const avgPriorityFee = totalPriorityFee.div(blockFeeData.length);
    return {
      avgBaseFee: avgBaseFee.toString(),
      avgPriorityFee: avgPriorityFee.toString(),
    };
  }

  /**
   * Filters out transactions that do not represent simple native ETH transfers
   * (i.e., transactions involving contract interactions or other non-standard transfers).
   * Transactions are filtered based on both the recipient ('to') and sender ('from') addresses.
   * @param transactions - An array of TransactionResponse objects representing Ethereum transactions.
   * @returns An array of filtered transactions representing simple native ETH transfers.
   */
  private async filterNonContractTransfers(
    transactions: TransactionResponse[],
  ): Promise<TransactionResponse[]> {
    // Fetch bytecode for 'to' and 'from' addresses in parallel
    const bytecodePromises = transactions.map(async (tx) => {
      if (tx.to && tx.from) {
        const toByteCode = await this.ethersProvider.getBytecode(tx.to);
        const fromByteCode = await this.ethersProvider.getBytecode(tx.from);
        return { tx, toByteCode, fromByteCode };
      } else {
        return { tx, toByteCode: null, fromByteCode: null };
      }
    });

    // Wait for bytecode fetches to complete
    const results = await Promise.all(bytecodePromises);

    // Filter transactions based on bytecode of 'to' and 'from' addresses
    return results
      .filter(
        ({ toByteCode, fromByteCode }) =>
          this.isNonContractTransfer(toByteCode) &&
          this.isNonContractTransfer(fromByteCode),
      )
      .map(({ tx }) => tx);
  }

  /**
   * Determines if a transaction represents a simple ETH transfer (non-contract interaction).
   * @param code - The bytecode of the transaction's recipient (null if no recipient).
   * @returns `true` if the transaction is a simple ETH transfer, `false` otherwise.
   */
  private isNonContractTransfer(code: string | null): boolean {
    // Handle potential null bytecode
    return code !== null && code === '0x';
  }

  /**
   * Filters out transactions that do not represent native ETH transfers.
   * @param transactions - An array of TransactionResponse objects.
   * @returns An array of filtered transactions representing only native ETH transfers.
   */
  private async filterNativeEthTransfers(
    transactions: TransactionResponse[],
  ): Promise<TransactionResponse[]> {
    const filteredTxs = await this.filterNonContractTransfers(transactions);
    return filteredTxs.filter((tx) => tx.value.gt(0) && tx.data === '0x');
  }

  /**
   * Calculates the total transaction fees (base fee + priority fee) for each block.
   * @param blocks - An array of BlockWithTransactions objects.
   * @returns An array of BlockFeeData objects, each containing fee data for a block.
   */
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

  /**
   * Extracts the block number range represented by the provided array of blocks.
   * @param blocks - An array of BlockWithTransactions objects.
   * @returns A Range object containing the starting block, ending block, and total count.
   */
  private getBlockRange(blocks: BlockWithTransactions[]): Range {
    const startBlock = blocks[0]?.number;
    const lastBlock = blocks[blocks.length - 1]?.number;
    const numberOfBlocks = lastBlock - startBlock + 1;
    return { from: startBlock, to: lastBlock, total: numberOfBlocks };
  }

  /**
   * Calculates the average maximum priority fee across transactions within a block.
   * @param transactions - An array of TransactionResponse objects.
   * @returns The average max priority fee as a BigNumber.
   */
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

  /**
   * Calculates the total maximum priority fees across all provided transactions.
   * @param transactions - An array of TransactionResponse objects.
   * @returns The total max priority fee as a BigNumber.
   */
  private calculateTotalMaxPriorityFee(transactions: TransactionResponse[]) {
    return transactions.reduce((priorityFee: BigNumber, tx) => {
      return tx.maxPriorityFeePerGas
        ? tx.maxPriorityFeePerGas.add(priorityFee)
        : constants.Zero;
    }, constants.Zero);
  }

  /**
   * Calculates the average native ETH transfer fee across a set of blocks.
   * @param blocks - An array of BlockFeeData objects containing fee information for each block.
   * @returns The average native ETH transfer fee as a BigNumber.
   */
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
