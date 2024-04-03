import { Module } from '@nestjs/common';
import { ethersProvider } from '../providers/ethers.provider';

@Module({
    providers: [ethersProvider]
})
export class BlockCacheModule {}
