import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { fromEvent, Observable, Subject } from 'rxjs';
import {
  BackOffPolicy,
  ExponentialBackoffStrategy,
  Retryable,
} from 'typescript-retry-decorator';

interface BlockEvent {
  blockNumber: number; 
}

enum ConnectionStatus { 
  Unknown = -1,
  Connecting = 0,
  Open = 1, 
  Closing = 2,
  Closed = 3
}

@Injectable()
export class Ethers {
  private ethersWebsocketProvider: ethers.providers.WebSocketProvider;
  readonly logger = new Logger(Ethers.name);
  private newBlockSubject = new Subject<BlockEvent>(); // For emitting new block numbers
  private blockNumberObservable: Observable<BlockEvent>; 

  constructor(@Inject(ConfigService) private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeProvider();
    await this.setOnBlockListener();
  }

  private async initializeProvider() {
    try {
      this.ethersWebsocketProvider = await this.connectToWebsocketProvider();
    } catch (error) {
      this.logger.error('Error initializing provider:', error);
    }
  }

  async setOnBlockListener() {
    const blockObservable = fromEvent(this.ethersWebsocketProvider, 'block');
  
    blockObservable.subscribe({ 
      next: (blockEvent: BlockEvent) => {
        this.logger.log(`New Block: ${blockEvent}`);
        this.newBlockSubject.next(blockEvent);
      },
      error: (err) => {
        this.logger.error('Error in block observable:', err);
      }
    });
  }

  async connectToWebsocketProvider(): Promise<ethers.providers.WebSocketProvider> {
    const wssUrl = this.configService.getOrThrow<string>('WSS_WEB3_URL');
    return await this.establishWebsocketConnectionWithRetries(wssUrl);
  }

  @Retryable({
    maxAttempts: Number.MAX_VALUE,
    backOffPolicy: BackOffPolicy.ExponentialBackOffPolicy,
    backOff: 1000,
    exponentialOption: {
      maxInterval: 4000,
      multiplier: 2,
      backoffStrategy: ExponentialBackoffStrategy.EqualJitter,
    },
  })
  private async establishWebsocketConnectionWithRetries(wssUrl: string): Promise<ethers.providers.WebSocketProvider> {
    try {
      const provider = new ethers.providers.WebSocketProvider(wssUrl);
      return provider; 
    } catch (error) {
      this.logger.error(`establishWebsocketConnectionWithRetries: ${error}`);
      this.ethersWebsocketProvider?.destroy(); // Cleanup on error
      throw error;
    }
  }

  getConnectionState(): ConnectionStatus { 
    return this.ethersWebsocketProvider.websocket.readyState as ConnectionStatus; 
  }

  async disposeCurrentProvider() {
    await this.ethersWebsocketProvider.destroy();
  }

  async onModuleDestroy() {
    if (this.ethersWebsocketProvider) {
      await this.disposeCurrentProvider();
    }
    this.newBlockSubject.unsubscribe();
    this.newBlockSubject.complete();
  }

  //TODO: Think of a better name
  getWebsocketProvider(): ethers.providers.WebSocketProvider { 
    if (this.getConnectionState() === ConnectionStatus.Open) {
      throw new Error('Websocket provider not connected');
    }
    return this.ethersWebsocketProvider;
  }
  getNewBlockObservable(): Observable<BlockEvent> {
    return this.newBlockSubject.asObservable();
  }
}
