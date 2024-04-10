import { BigNumber } from 'ethers';

export interface BlockEvent {
  blockNumber: number;
  isSynthetic: boolean;
}

export enum Unit {
  Wei = 'wei',
  Gwei = 'gwei',
  Ether = 'ether',
}

export interface BlockStat {
  averageFeePerBlockInRange: string;
  // lastBlockEthTransferFee:BigNumber;
  // last5BlocksEthTransferFee:BigNumber;
  // last30BlocksEthTransferFee:BigNumber;
  unit: string;
  optimalFee?: BigNumber; // Placeholder for future implementation
  // Difficulty to estimate mempool size accurately; omit for now
  // mempoolSize: BigNumber,
  blockFullness?: BigNumber; // (0 - 100 representing percentage full)
  fromBlockNumber: number;
  toBlockNumber: number;
  totalBlocks: number;
}

export interface BlockFeeData {
  baseFee: BigNumber;
  averagePriorityFee: BigNumber; // Assuming BigNumber is appropriate for your use case
}

export interface Range {
  from: number;
  to: number;
  total: number;
}
