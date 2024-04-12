import { ApiProperty } from '@nestjs/swagger';
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

export class BlockStat {
  @ApiProperty()
  averageFeePerBlockInRange: string;

  @ApiProperty()
  unit: string;

  @ApiProperty({ required: false })
  optimalFee?: BigNumber; // Placeholder for future implementation

  @ApiProperty({ required: false })
  blockFullness?: BigNumber; // (0 - 100 representing percentage full)

  @ApiProperty()
  fromBlockNumber: number;

  @ApiProperty()
  toBlockNumber: number;

  @ApiProperty()
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
