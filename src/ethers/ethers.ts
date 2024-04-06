import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import {
  Observable,
  Subject,
  distinctUntilChanged,
  fromEvent
} from 'rxjs';
import {
  BackOffPolicy,
  ExponentialBackoffStrategy,
  Retryable,
} from 'typescript-retry-decorator';

enum ConnectionStatus {
  Unknown = -1,
  Connecting = 0,
  Open = 1,
  Closing = 2,
  Closed = 3,
}

@Injectable()
export class Ethers {
  private ethersWebsocketProvider: ethers.providers.WebSocketProvider;
  private readonly logger = new Logger(Ethers.name);
  private newBlockSubject = new Subject<BlockWithTransactions>(); // For emitting new block numbers
  private lastBlockNumber: number;
  private lastBlockWithTransaction: BlockWithTransactions;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeProvider();
    await this.setOnBlockListener();
  }

  private async initializeProvider() {
    try {
      this.ethersWebsocketProvider = await this.connectToWebsocketProvider();
      this.logger.debug('WebSocket provider initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing provider:', error);
      throw error; // Ensure the error propagates for handling
    }
  }

  async setOnBlockListener() {
    const blockObservable = fromEvent(
      this.ethersWebsocketProvider,
      'block',
    ).pipe(
      distinctUntilChanged(), // Filter duplicates
    );

    blockObservable.subscribe({
      next: async (blockNumber: number) => {
        if (this.lastBlockNumber !== blockNumber) {
          this.logger.debug(`Recieved new block number: ${blockNumber}`);
          this.lastBlockNumber = blockNumber - 1; // Update lastBlockNumbers
          await this.handleBlockEvent(blockNumber);
        } else {
          this.logger.debug(`Skipping duplicate block number: ${blockNumber}`);
        }
      },
      error: (err) => {
        this.logger.error('Error in block observable:', err);
      },
    });
  }

  private async handleBlockEvent(blockNumber: number) {
    const expectedBlockNumber = this.lastBlockNumber + 1;

    if (blockNumber > expectedBlockNumber) {
      await this.generateSyntheticBlocks(expectedBlockNumber, blockNumber);
      this.logger.warn(
        `Missed blocks: Generated synthetic blocks from ${expectedBlockNumber} to ${blockNumber - 1}`,
      );
    }

    this.lastBlockWithTransaction =
      await this.getLatestBlockWithTransactions(blockNumber);
    this.newBlockSubject.next(this.lastBlockWithTransaction);
  }

  private async generateSyntheticBlocks(start: number, end: number) {
    for (let blockNumber = start; blockNumber < end; blockNumber++) {
      const blockWithTransactions =
        await this.getLatestBlockWithTransactions(blockNumber);
      this.newBlockSubject.next(blockWithTransactions);
    }
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
  private async establishWebsocketConnectionWithRetries(
    wssUrl: string,
  ): Promise<ethers.providers.WebSocketProvider> {
    try {
      const provider = new ethers.providers.WebSocketProvider(wssUrl);
      return provider;
    } catch (error) {
      this.logger.error(`establishWebsocketConnectionWithRetries: ${error}`);
      await this.disposeCurrentProvider(); // Cleanup on error
      throw error;
    }
  }

  //TODO do we get ready state after connection or not
  getConnectionState(): ConnectionStatus {
    return this.ethersWebsocketProvider?.websocket
      .readyState as ConnectionStatus;
  }

  async disposeCurrentProvider() {
    await this.ethersWebsocketProvider?.destroy();
  }

  async onModuleDestroy() {
    if (this.ethersWebsocketProvider) {
      await this.disposeCurrentProvider();
    }
    this.newBlockSubject.unsubscribe();
    this.newBlockSubject.complete();
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
  async getLatestBlockNumber(): Promise<number> {
    try {
      const blockNumber = await this.ethersWebsocketProvider.getBlockNumber();
      return blockNumber;
    } catch (e) {
      this.logger.error(`getLatestBlockNumber: ${e}`);
      throw e;
    }
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
  async getLatestBlockWithTransactions(
    blockNumber: number,
  ): Promise<BlockWithTransactions> {
    try {
      return await this.ethersWebsocketProvider.getBlockWithTransactions(
        blockNumber,
      );
    } catch (e) {
      this.logger.error(`getBlockWithTransactions: ${e}`);
      throw e;
    }
  }

  //TODO: name this as getProvider as ethers.getProvider makes more sense and provide more abstraction
  getWebsocketProvider(): ethers.providers.WebSocketProvider {
    if (this.getConnectionState() === ConnectionStatus.Open) {
      throw new Error('Websocket provider not connected');
    }
    return this.ethersWebsocketProvider;
  }
  getNewBlockObservable(): Observable<BlockWithTransactions> {
    return this.newBlockSubject.asObservable().pipe(
      distinctUntilChanged(), // Filter duplicates
    );
  }
}
