import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigModule } from '../config/config.module';
import { Ethers } from '../ethers/ethers';
import { BlockCacheService } from './block-cache.service';

describe('BlockCacheService', () => {
  let blockCacheService: BlockCacheService;
  let configService: ConfigService;
  let ethersProvider: Ethers;
  let wssWeb3Url: string;
  let MAX_CACHE_SIZE: number;
  const mockBlockNumber = 19609637;
  let mockBlockWithTransactions: BlockWithTransactions;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppConfigModule],
      providers: [BlockCacheService, Ethers, ConfigService],
    }).compile();

    blockCacheService = module.get<BlockCacheService>(BlockCacheService);
    configService = module.get<ConfigService>(ConfigService);
    ethersProvider = module.get<Ethers>(Ethers);

    wssWeb3Url = configService.getOrThrow<string>('WSS_WEB3_URL');
    MAX_CACHE_SIZE = configService.getOrThrow<number>('MAX_CACHE_SIZE');
    ethersProvider['ethersWebsocketProvider'] =
      await ethersProvider['establishWebsocketConnectionWithRetries'](
        wssWeb3Url,
      );
    mockBlockWithTransactions =
      await ethersProvider.getBlockWithTransactionsByNumber(mockBlockNumber);
  });

  afterEach(async () => {
    await ethersProvider['disposeCurrentProvider']();
  });

  it('should be defined', () => {
    expect(blockCacheService).toBeDefined();
  });

  describe('backfillCache', () => {
    it('should fetch and populate the cache in case of partially filled cache', async () => {
      jest
        .spyOn(ethersProvider, 'getLatestBlockNumber')
        .mockResolvedValueOnce(mockBlockNumber);
      const latestBlockWithTransactions =
        await ethersProvider.getBlockWithTransactionsByNumber(
          mockBlockNumber - 2,
        );

      blockCacheService['blockCache'].set(
        latestBlockWithTransactions.number,
        latestBlockWithTransactions,
        { ttl: latestBlockWithTransactions.timestamp },
      );
      await blockCacheService['backfillCache']();

      const expectedCacheSize =
        mockBlockNumber - latestBlockWithTransactions.number + 1;
      expect(blockCacheService['blockCache'].size).toEqual(expectedCacheSize);
    }, 10000);
  });

  describe('appendBlockToCache', () => {
    it('should successfully append the block to cache', async () => {
      await blockCacheService['appendBlockToCache'](mockBlockWithTransactions);

      expect(
        blockCacheService['blockCache'].get(mockBlockNumber)?.hash,
      ).toEqual(
        '0x3bbe281696355ad0417fdda4fb1aa63d34589b998e6723d21515ac20240e7323',
      );
    });

    it('should return if the block is already present', async () => {
      blockCacheService['blockCache'].set(
        mockBlockNumber,
        mockBlockWithTransactions,
        {
          ttl: mockBlockWithTransactions.timestamp,
        },
      );

      await blockCacheService['appendBlockToCache'](mockBlockWithTransactions);

      expect(blockCacheService['hasBlockInCache'](mockBlockNumber)).toEqual(
        true,
      );
    });
  });

  describe('getLatestBlockFromCache', () => {
    it('should return the latest block stored in cache', async () => {
      console.log('TCL: mockBlockWithTransactions', mockBlockWithTransactions);
      blockCacheService['blockCache'].set(
        mockBlockNumber,
        mockBlockWithTransactions,
        {
          ttl: mockBlockWithTransactions.timestamp,
        },
      );
      const latestBlockFromCache = blockCacheService.getLatestBlockFromCache();
      expect(latestBlockFromCache.hash).toEqual(mockBlockWithTransactions.hash);
    });

    it('should throw Error when cache is empty', () => {
      let errorCaught = null;

      try {
        blockCacheService.getLatestBlockFromCache();
      } catch (error) {
        errorCaught = error;
      }

      expect(errorCaught).toBeInstanceOf(Error);
      expect(errorCaught.message).toBe('No blocks found in cache');
    });
  });

  describe('getLatestNBlocks', () => {
    it('should return the last block or the latest block in the cache', async () => {
      const n = 5;
      for (let i = mockBlockNumber - n - 1; i <= mockBlockNumber; i++) {
        blockCacheService['blockCache'].set(i, mockBlockWithTransactions, {
          ttl: mockBlockWithTransactions.timestamp,
        });
      }
      const latestBlock = blockCacheService.getLatestNBlocks(5);
      expect(latestBlock.length).toEqual(n);
    });

    it('should throw Exception when n exceeds cache size', async () => {
      const n = 32;
      let errorMessage;
      try {
        const blocks = blockCacheService.getLatestNBlocks(n);
      } catch (error) {
        errorMessage = error.message;
      }
      expect(errorMessage).toEqual(`${n} exceeds hard limit ${MAX_CACHE_SIZE}`);
    });
  });

  describe('isCacheStale', () => {
    it('should return true if the last block in the cache is older than the block interval', async () => {
      blockCacheService['blockCache'].set(
        mockBlockNumber,
        mockBlockWithTransactions,
        { ttl: mockBlockWithTransactions.timestamp },
      );

      expect(blockCacheService.isCacheStale()).toEqual(true);
    });
  });
});
