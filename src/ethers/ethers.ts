import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { RateLimiter } from 'limiter';
import { Observable, Subject, catchError, distinct, fromEvent } from 'rxjs';
import { Memoize } from 'typescript-memoize';
import { Retryable } from 'typescript-retry-decorator';
import { ConnectionStatus } from '../types/ethers';

// Allow 300 requests per second
const byteCodeLimiter = new RateLimiter({
  tokensPerInterval: 300,
  interval: 'second',
});

@Injectable()
export class Ethers {
  private ethersWebsocketProvider: ethers.providers.WebSocketProvider;
  private readonly logger = new Logger(Ethers.name);
  private newBlockSubject = new Subject<BlockWithTransactions>(); // For emitting new block numbers
  private lastBlockNumber: number;
  private lastBlockWithTransaction: BlockWithTransactions;
  private previousBlockNumber: number;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeProvider();
    await this.setOnBlockListener();
  }

  private async initializeProvider() {
    try {
      if (this.ethersWebsocketProvider) {
        await this.disposeCurrentProvider();
      }
      this.ethersWebsocketProvider = await this.connectToWebsocketProvider();
      this.logger.debug('WebSocket provider initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing provider:', error);
      throw error; // Ensure the error propagates for handling
    }
  }

  private async setOnBlockListener() {
    const blockObservable = fromEvent(
      this.ethersWebsocketProvider,
      'block',
    ).pipe(distinct((blockNumber) => blockNumber));

    blockObservable.subscribe({
      next: async (blockNumber: number) =>
        await this.handleNewBlock(blockNumber),
    });
  }

  private async handleNewBlock(blockNumber: number) {
    if (!this.previousBlockNumber || this.previousBlockNumber < blockNumber) {
      this.logger.debug(`Received new block number: ${blockNumber}`);
      this.previousBlockNumber = blockNumber;
      await this.handleBlockEvent(blockNumber);
    } else {
      this.logger.debug(`Skipping duplicate block number: ${blockNumber}`);
    }
  }

  private async handleBlockEvent(blockNumber: number): Promise<void> {
    let expectedBlockNumber: number = blockNumber;
    if (this.lastBlockNumber) expectedBlockNumber = this.lastBlockNumber + 1;

    if (blockNumber !== expectedBlockNumber) {
      await this.generateSyntheticBlocks(expectedBlockNumber, blockNumber);
      this.logger.warn(
        `Missed blocks: Generated synthetic blocks from ${expectedBlockNumber} to ${blockNumber}`,
      );
    }

    this.lastBlockWithTransaction =
      await this.getBlockWithTransactionsByNumber(blockNumber);
    this.lastBlockNumber = blockNumber;
    this.newBlockSubject.next(this.lastBlockWithTransaction);
  }

  private async generateSyntheticBlocks(
    start: number,
    end: number,
  ): Promise<void> {
    for (let blockNumber = start; blockNumber < end; blockNumber++) {
      const blockWithTransactions =
        await this.getBlockWithTransactionsByNumber(blockNumber);
      this.newBlockSubject.next(blockWithTransactions);
    }
  }

  private async connectToWebsocketProvider(): Promise<ethers.providers.WebSocketProvider> {
    const wssUrl = this.configService.getOrThrow<string>('WSS_WEB3_URL');
    return await this.establishWebsocketConnectionWithRetries(wssUrl);
  }

  @Retryable({
    maxAttempts: Number.MAX_VALUE,
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

  getConnectionState(): ConnectionStatus {
    return this.ethersWebsocketProvider?.websocket
      .readyState as ConnectionStatus;
  }

  private async disposeCurrentProvider() {
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

  @Memoize((blockNumber: number) => blockNumber)
  @Retryable({
    maxAttempts: Number.MAX_VALUE,
  })
  async getBlockWithTransactionsByNumber(
    blockNumber: number,
  ): Promise<BlockWithTransactions> {
    try {
      this.logger.debug(
        'TCL: Ethers -> constructor -> blockNumber',
        blockNumber,
      );
      return await this.ethersWebsocketProvider.getBlockWithTransactions(
        blockNumber,
      );
    } catch (e) {
      this.logger.error(`getBlockWithTransactions: ${e}`);
      throw e;
    }
  }

  @Memoize((address: string) => address)
  @Retryable({
    maxAttempts: Number.MAX_VALUE,
  })
  async getBytecode(address: string): Promise<string> {
    try {
      return await this.ethersWebsocketProvider.getCode(address);
    } catch (error) {
      this.logger.error('Error fetching bytecode:', error);
      throw error;
    } finally {
      await byteCodeLimiter.removeTokens(1);
    }
  }

  getNewBlockObservable(): Observable<BlockWithTransactions> {
    return this.newBlockSubject.asObservable().pipe(
      distinct((block: BlockWithTransactions) => block.number),
      catchError((error) => {
        this.logger.error('Error in block observable:', error);
        throw error; // Handle other errors as before
      }),
    );
  }
}
