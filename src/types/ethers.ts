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

export interface BlockFeeData {
  baseFee: BigNumber;
  averagePriorityFee: BigNumber; // Assuming BigNumber is appropriate for your use case
}

export interface Range {
  from: number;
  to: number;
  total: number;
}

export enum ConnectionStatus {
  Unknown = -1,
  Connecting = 0,
  Open = 1,
  Closing = 2,
  Closed = 3,
}
