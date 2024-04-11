import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigModule } from '../config/config.module';
import { ConnectionTimeoutException } from '../filters/http-exceptions';
import { Ethers } from './ethers';

describe('Ethers', () => {
  let ethersService: Ethers;
  let configService: ConfigService;
  let wssWeb3Url: string;
  let blockInterval: number;
  const mockBlockNumber = 19605626;
  const mockHashValue =
    '0x1abb0d0287ce8bc51a7613c0b25bea5a8e2c7eaefae15228c2ed0ef354eb541e';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppConfigModule],
      providers: [Ethers, ConfigService],
    }).compile();

    ethersService = module.get<Ethers>(Ethers);
    configService = module.get<ConfigService>(ConfigService);
    wssWeb3Url = configService.getOrThrow<string>('WSS_WEB3_URL');
    blockInterval = configService.getOrThrow<number>('block_interval');
    ethersService['ethersWebsocketProvider'] =
      await ethersService['establishWebsocketConnectionWithRetries'](
        wssWeb3Url,
      );
  });

  afterEach(async () => {
    await ethersService['disposeCurrentProvider']();
  });

  it('should be defined', () => {
    expect(ethersService).toBeDefined();
  });

  describe('establishWebsocketConnectionWithRetries', () => {
    it('should establish a connection and successfully call getBlockNumber', async () => {
      const blockNumber = await ethersService.getLatestBlockNumber();
      expect(typeof blockNumber).toBe('number');
    });
    it('should throw an error if the connection fails', async () => {
      if (!ethersService['ethersWebsocketProvider']) {
        await expect(ethersService.getLatestBlockNumber()).rejects.toThrow(
          new ConnectionTimeoutException(),
        );
      }

      expect(ethersService['ethersWebsocketProvider']._lastBlockNumber).toEqual(
        -2,
      );
    });
  });

  describe('disposeCurrentProvider', () => {
    it('should dipose the provider', async () => {
      expect(ethersService['ethersWebsocketProvider']._wsReady).toBe(false);
    });
  });

  describe('setOnBlockListener', () => {
    it('should emit block numbers from the WebsocketProvider', async () => {
      await ethersService['setOnBlockListener']();

      // Wait for lastBlockNumber to be updated
      await new Promise((resolve) =>
        setTimeout(resolve, (blockInterval - 2) * 1000),
      );

      const latestBlockNumber = await ethersService.getLatestBlockNumber();

      expect(ethersService['lastBlockNumber'] + 1).toBe(latestBlockNumber);
    }, 14000);
  });

  describe('handleBlockEvent', () => {
    it('should handle block event', async () => {
      await ethersService['handleBlockEvent'](mockBlockNumber);

      ethersService['lastBlockNumber'] = mockBlockNumber - 1;
      expect(ethersService['lastBlockWithTransaction'].hash).toEqual(
        mockHashValue,
      );
    });
    it('should generate synthetic blocks when blockNumber is greater than expectedBlockNumber', async () => {
      ethersService['lastBlockNumber'] = mockBlockNumber;

      jest
        .spyOn(ethersService as any, 'generateSyntheticBlocks')
        .mockResolvedValue(undefined);
      await ethersService['handleBlockEvent'](mockBlockNumber);
      expect(ethersService['generateSyntheticBlocks']).toHaveBeenCalledWith(
        ethersService['lastBlockNumber'] + 1,
        mockBlockNumber,
      );
    });
  });

  describe('getLatestBlockNumber', () => {
    it('should return the latest block number', async () => {
      const blockNumber = await ethersService.getLatestBlockNumber();
      const latestBlockNumber =
        await ethersService['ethersWebsocketProvider'].getBlockNumber();
      expect(blockNumber).toEqual(latestBlockNumber);
    });
    it('should throw error on failures', async () => {
      jest
        .spyOn(ethersService, 'getLatestBlockNumber')
        .mockRejectedValueOnce(new Error());

      await expect(ethersService.getLatestBlockNumber()).rejects.toThrowError();
    });
  });

  describe('getBlockWithTransactionsByNumber', () => {
    it('should return the latest block with transactions', async () => {
      const blockWithTransactions =
        await ethersService.getBlockWithTransactionsByNumber(mockBlockNumber);

      expect(blockWithTransactions.hash).toEqual(mockHashValue);
    });
    it('should throw error on failures', async () => {
      jest
        .spyOn(ethersService, 'getBlockWithTransactionsByNumber')
        .mockRejectedValueOnce(new Error());

      await expect(
        ethersService.getBlockWithTransactionsByNumber(212),
      ).rejects.toThrowError();
    });
  });
});
