import { ApiProperty } from '@nestjs/swagger';
import { BigNumber } from 'ethers';
import { NativeEthTransfer } from './native-eth-transfer.dto';

export class BlockStats {
  @ApiProperty({
    description: 'Average fee per block for native ETH transfers',
    type: NativeEthTransfer,
  })
  nativeEthTransfer: NativeEthTransfer;

  @ApiProperty({ required: false })
  optimalFee?: BigNumber;

  @ApiProperty({
    required: false,
    description: 'Block fullness (0-100 representing percentage)',
  })
  blockFullness?: BigNumber;

  @ApiProperty()
  fromBlockNumber: number;

  @ApiProperty()
  toBlockNumber: number;

  @ApiProperty()
  totalBlocks: number;
}
