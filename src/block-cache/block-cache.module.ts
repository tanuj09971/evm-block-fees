import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EthersModule } from '../ethers/ethers.module';
import { BlockCacheService } from './block-cache.service';

@Module({
  imports: [EthersModule],
  providers: [BlockCacheService, ConfigModule],
  exports: [EthersModule, BlockCacheService],
})
export class BlockCacheModule {}
