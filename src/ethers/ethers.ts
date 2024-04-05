import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { Observable, Subject, fromEvent } from 'rxjs';
import {
  BackOffPolicy,
  ExponentialBackoffStrategy,
  Retryable,
} from 'typescript-retry-decorator';
import { BlockEvent } from '../types/ethers';
import { BlockWithTransactions } from '@ethersproject/abstract-provider';

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
    this.lastBlockNumber = await this.getLatestBlockNumber();
    await this.setOnBlockListener();
  }

  private async initializeProvider() {
    try {
      this.ethersWebsocketProvider = await this.connectToWebsocketProvider();
    } catch (error) {
      this.logger.error('Error initializing provider:', error);
    }
  }

  /*
  const blockObservable = fromEvent(
      this.ethersWebsocketProvider,
      'block',
    ).pipe(
      distinctUntilChanged(), // Filter duplicates
      map((blockNumber: number) => ({ blockNumber, isSynthetic: false })), // Create BlockEvent
    );

    blockObservable.subscribe({
      next: async (blockEvent: BlockEvent) => {
        this.lastBlockNumber = blockEvent.blockNumber; // Update lastBlockNumber
        await this.handleBlockEvent(blockEvent);
      },
      error: (err) => {
        this.logger.error('Error in block observable:', err);
      },
    }); */
  async setOnBlockListener() {
    const blockObservable = fromEvent(this.ethersWebsocketProvider, 'block');

    blockObservable.subscribe({
      next: async (blockNumber: number) => {
        if (this.lastBlockNumber !== blockNumber) {
          // Check for difference
          this.lastBlockNumber = blockNumber; // Update only if different

          const blockEvent: BlockEvent = {
            blockNumber,
            isSynthetic: false,
          };
          await this.handleBlockEvent(blockEvent);
        } else {
          console.log(`Skipping duplicate block number: ${blockNumber}`); // Optional log
        }
      },
      error: (err) => {
        this.logger.error('Error in block observable:', err);
      },
    });
  }

  private async handleBlockEvent(blockEvent: BlockEvent) {
    const expectedBlockNumber = this.lastBlockNumber + 1;

    if (blockEvent.blockNumber > expectedBlockNumber) {
      await this.generateSyntheticBlocks(
        expectedBlockNumber,
        blockEvent.blockNumber,
      );
      this.logger.warn(
        `Missed blocks: Generated synthetic blocks from ${expectedBlockNumber} to ${blockEvent.blockNumber - 1}`,
      );
    }

    this.lastBlockNumber = blockEvent.blockNumber;
    this.lastBlockWithTransaction = await this.getLatestBlockWithTransactions(
      this.lastBlockNumber,
    );
    this.newBlockSubject.next(this.lastBlockWithTransaction);
  }

  private async generateSyntheticBlocks(start: number, end: number) {
    for (let i = start; i < end; i++) {
      // this.newBlockSubject.next({ blockNumber: i, isSynthetic: true });
      const blockWithTransactions =
        await this.getLatestBlockWithTransactions(i);
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
      return await this.ethersWebsocketProvider.getBlockNumber();
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

  //TODO: Think of a better name
  getWebsocketProvider(): ethers.providers.WebSocketProvider {
    if (this.getConnectionState() === ConnectionStatus.Open) {
      throw new Error('Websocket provider not connected');
    }
    return this.ethersWebsocketProvider;
  }
  getNewBlockObservable(): Observable<BlockWithTransactions> {
    return this.newBlockSubject.asObservable();
  }
}
