import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { BlockFeesService } from './block-fees.service';
import { BlockStat } from 'src/types/ethers';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { ThrottlerGuard } from '@nestjs/throttler';

@UseInterceptors(CacheInterceptor)
@Controller({ path: 'block-fees', version: '1' })
@UseGuards(ThrottlerGuard)
export class BlockFeesController {
  constructor(private readonly blockFeesService: BlockFeesService) {}

  @Get('estimate')
  async getFeeEstimate(): Promise<BlockStat[]> {
    return await this.blockFeesService.calculateFeeEstimate();
  }
}
