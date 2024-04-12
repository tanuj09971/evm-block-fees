import { CacheInterceptor } from '@nestjs/cache-manager';
import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { BlockStat } from '../types/ethers';
import { BlockFeesService } from './block-fees.service';

@ApiTags('Block Fees')
@UseInterceptors(CacheInterceptor)
@Controller({ path: 'block-fees', version: '1' })
@UseGuards(ThrottlerGuard)
export class BlockFeesController {
  constructor(private readonly blockFeesService: BlockFeesService) {}

  @Get('estimate')
  @ApiOkResponse({
    description: 'Returns fee estimates for blocks',
    type: BlockStat, // Specify the response type
    isArray: true, // Indicates the response is an array of BlockStat objects
  })
  async getFeeEstimate(): Promise<BlockStat[]> {
    return await this.blockFeesService.calculateFeeEstimate();
  }
}
