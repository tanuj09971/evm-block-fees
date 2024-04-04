import { Module } from '@nestjs/common';
import { Ethers } from './ethers';

@Module({
  providers: [Ethers],
})
export class EthersModule {}
