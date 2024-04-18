import { ApiProperty } from '@nestjs/swagger';

export class NativeEthTransfer {
  @ApiProperty()
  averageFee: string;

  @ApiProperty()
  priorityFee: string;

  @ApiProperty()
  baseFee: string;
  
  @ApiProperty()
  unit: string;
}
