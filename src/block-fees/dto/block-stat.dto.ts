import { ApiProperty } from '@nestjs/swagger';
import { BigNumber } from 'ethers';

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
