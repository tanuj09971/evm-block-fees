import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Ethers } from '../ethers/ethers';
import { BlockCacheService } from './block-cache.service';
import { AppConfigModule } from '../config/config.module';
import { Logger } from '@nestjs/common';

describe('BlockCacheService', () => {
  let blockCacheService: BlockCacheService;
  let configService: ConfigService;
  let logger: Logger;
  let ethersProvider: Ethers;
  let wssWeb3Url: string;
  let MAX_CACHE_SIZE: number;
  const mockBlockNumber = 19609637;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppConfigModule],
      providers: [BlockCacheService, Ethers, ConfigService, Logger],
    }).compile();

    blockCacheService = module.get<BlockCacheService>(BlockCacheService);
    logger = module.get<Logger>(Logger);
    configService = module.get<ConfigService>(ConfigService);
    ethersProvider = module.get<Ethers>(Ethers);

    wssWeb3Url = configService.getOrThrow<string>('WSS_WEB3_URL');
    MAX_CACHE_SIZE = configService.getOrThrow<number>('max_cache_size');
    ethersProvider['ethersWebsocketProvider'] =
      await ethersProvider['establishWebsocketConnectionWithRetries'](
        wssWeb3Url,
      );
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
    });
  });

  describe('appendBlockToCache', () => {
    it('should successfully append the block to cache', async () => {
      const blockWithTransactions =
        await ethersProvider.getBlockWithTransactionsByNumber(mockBlockNumber);
      await blockCacheService['appendBlockToCache'](blockWithTransactions);

      expect(
        blockCacheService['blockCache'].get(mockBlockNumber)?.hash,
      ).toEqual(
        '0x3bbe281696355ad0417fdda4fb1aa63d34589b998e6723d21515ac20240e7323',
      );
    });

    // it('should return if the block is already present', async () => {
    //   const blockWithTransactions =
    //     await ethersProvider.getBlockWithTransactionsByNumber(mockBlockNumber);
    //   blockCacheService['blockCache'].set(
    //     mockBlockNumber,
    //     blockWithTransactions,
    //     {
    //       ttl: blockWithTransactions.timestamp,
    //     },
    //   );

    //   await blockCacheService['appendBlockToCache'](blockWithTransactions);

    //   expect(logger.debug).toHaveBeenCalledWith(
    //     `Block already present in the cache: ${blockWithTransactions.number}`,
    //   );
    // });
  });

  describe('getLatestBlockFromCache', () => {
    it('should return the latest block stored in cache', async () => {
      const blockWithTransactions =
        await ethersProvider.getBlockWithTransactionsByNumber(mockBlockNumber);
      blockCacheService['blockCache'].set(
        mockBlockNumber,
        blockWithTransactions,
        {
          ttl: blockWithTransactions.timestamp,
        },
      );
      const latestBlockFromCache = blockCacheService.getLatestBlockFromCache();
      expect(latestBlockFromCache.hash).toEqual(blockWithTransactions.hash);
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
});
