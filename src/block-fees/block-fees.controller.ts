import { CacheInterceptor } from '@nestjs/cache-manager';
import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { BlockFeesService } from './block-fees.service';
import { BlockStat } from './dto/block-stat.dto';

@ApiTags('Block Fees')
@UseInterceptors(CacheInterceptor)
@Controller({ path: 'block-fees', version: '1' })
@UseGuards(ThrottlerGuard)
export class BlockFeesController {
  constructor(private readonly blockFeesService: BlockFeesService) {}

  @Get('estimate')
  @ApiOkResponse({
    description: 'Returns fee estimates for blocks',
    type: BlockStat,
    isArray: true,
  })
  getFeeEstimate(): BlockStat[] {
    return this.blockFeesService.calculateFeeEstimate();
  }
}
