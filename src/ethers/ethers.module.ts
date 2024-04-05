import { Module } from '@nestjs/common';
import { Ethers } from './ethers';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [Ethers, ConfigService],
})
export class EthersModule {}
