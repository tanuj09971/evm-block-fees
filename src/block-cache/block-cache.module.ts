import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockCacheService } from './block-cache.service';

@Module({
  providers: [BlockCacheService, ConfigModule],
})
export class BlockCacheModule {}
