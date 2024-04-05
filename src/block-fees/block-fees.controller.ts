import { Controller, Get } from '@nestjs/common';
import { BlockFeesService } from './block-fees.service';
import { BlockStat } from 'src/types/ethers';

@Controller({ path: 'block-fees', version: '1' })
export class BlockFeesController {
  constructor(private readonly blockFeesService: BlockFeesService) {}

  @Get('estimate')
  async getFeeEstimate(): Promise<BlockStat[]> {
    return await this.blockFeesService.calculateFeeEstimate();
  }
}
