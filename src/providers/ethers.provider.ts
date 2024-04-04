import {
  FactoryProvider,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { Observable, Subject } from 'rxjs';

export const ETHERS_PROVIDER = 'ETHERS_PROVIDER';

@Injectable() // Not strictly necessary in this case, but good practice
export class EthersProvider implements OnModuleInit, OnModuleDestroy {
  provider: ethers.providers.WebSocketProvider;
  readonly logger = new Logger(EthersProvider.name);
  private newBlockSubject = new Subject<number>(); // For emitting new block numbers

  constructor(@Inject(ConfigService) private configService: ConfigService) {}

  async onModuleInit() {
    await this.initiateProviderWithWssUrl();
    await this.setProviderListners();
  }

  async setProviderListners() {
    await this.setOnErrorListner();
    await this.setOnBlockListner();
  }

  //TODO: reinitialize if error
  async setOnErrorListner() {
    this.provider.on('error', (err) => {
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
    const wssUrl = this.configService.getOrThrow<string>('WSS_WEB3_URL');
    this.provider = new ethers.providers.WebSocketProvider(wssUrl);
  }

  async disposeCurrentProvider() {
    await this.provider.destroy();
  }

  async onModuleDestroy() {
    if (this.provider) {
      await this.disposeCurrentProvider();
    }
    this.newBlockSubject.unsubscribe();
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
