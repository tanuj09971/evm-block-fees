import { FactoryProvider, OnModuleInit, OnModuleDestroy, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; 
import { ethers } from 'ethers';
import { fromEvent, Observable, Subject } from 'rxjs'; 

export const ETHERS_PROVIDER = 'ETHERS_PROVIDER';

@Injectable() // Not strictly necessary in this case, but good practice
export class EthersProvider implements OnModuleInit, OnModuleDestroy {
  private provider: ethers.providers.WebSocketProvider;
  private readonly logger = new Logger(EthersProvider.name);
  private newBlockSubject = new Subject<number>(); // For emitting new block numbers

  constructor(@Inject(ConfigService) private configService: ConfigService) {}

  async onModuleInit() {
    await this.initiateProviderWithWssUrl()
    await this.setProviderListners()
  }

  async setProviderListners() {
    await this.setOnErrorListner()
    await this.setOnBlockListner()
  }

  async setOnErrorListner() {
    this.provider.on("error", (err) => {
        this.logger.error('WebSocket Provider Error:', err);
    });
  }

  async setOnBlockListner() {
    this.provider.on('block', (blockNumber) => {
        this.logger.log(`New Block: ${blockNumber}`); 
        this.newBlockSubject.next(blockNumber);
    });
  }

  async initiateProviderWithWssUrl() {
    const wssUrl = this.configService.get<string>('WEB3_WSS_URL');

    if (!wssUrl) {
      throw new Error('WEB3_WSS_URL not found in environment');
    }
    this.provider = new ethers.providers.WebSocketProvider(wssUrl);
  }

  async disposeCurrentProvider() {
    await this.provider.destroy();
  }

  async onModuleDestroy() {
    if (this.provider) {
      await this.disposeCurrentProvider()
    }
  }

  //TODO: Think of a better name
  getProvider(): ethers.providers.WebSocketProvider {
    return this.provider;
  }

  getNewBlockObservable(): Observable<number> {
    return this.newBlockSubject.asObservable();
  }
}

export const ethersProvider: FactoryProvider = {
  provide: ETHERS_PROVIDER,
  useFactory: (ethersProvider: EthersProvider) => ethersProvider.getProvider(), 
  inject: [EthersProvider],
};