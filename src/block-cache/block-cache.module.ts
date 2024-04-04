import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockCacheService } from './block-cache.service';
import { Ethers } from '../ethers/ethers';

@Module({
  providers: [BlockCacheService, ConfigModule, Ethers],
})
export class BlockCacheModule {}
