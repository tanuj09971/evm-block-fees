import { Module } from '@nestjs/common';
import { BlockCacheService } from './block-cache/block-cache.service';
import { ethersProvider } from './providers/ethers.provider';
import { BlockCacheModule } from './block-cache/block-cache.module';

@Module({
  imports: [BlockCacheModule],
  controllers: [],
  providers: [BlockCacheService, ethersProvider],
})
export class AppModule {}
