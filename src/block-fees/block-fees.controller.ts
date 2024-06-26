import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BlockFeesService } from './block-fees.service';
import { BlockStats } from './dto/block-stats.dto';
import { CacheInterceptor } from '@nestjs/cache-manager';

@ApiTags('Block Fees')
@UseInterceptors(CacheInterceptor)
@Controller({ path: 'block-fees', version: '1' })
export class BlockFeesController {
  constructor(private readonly blockFeesService: BlockFeesService) {}

  @Get('estimate')
  @ApiOkResponse({
    description: 'Returns fee estimates for blocks',
    type: BlockStats,
    isArray: true,
  })
  getFeeEstimate(): BlockStats[] {
    return this.blockFeesService.calculateFeeEstimate();
  }
}
