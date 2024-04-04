import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ethers } from 'ethers';
import { ConnectionTimeoutException } from '../filters/http-exceptions';
import { Ethers } from './ethers';

describe('Ethers', () => {
  let ethers: Ethers;
  let configServiceMock: ConfigService;

  beforeEach(async () => {
    configServiceMock = { getOrThrow: { mockReturnValue: jest.fn() } } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Ethers,
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    ethers = module.get<Ethers>(Ethers);
    const mockUrl =
      'wss://sepolia.infura.io/v3/4e65725048f74194b9f4079e23a8a964';
    configServiceMock.getOrThrow = jest.fn().mockReturnValue(mockUrl);
  });

  it('should be defined', () => {
    expect(ethers).toBeDefined();
  });

  describe('connectProviderWithWssUrlOrRetryForever', () => {
    it('should establish a connection and successfully call getBlockNumber', async () => {
      await ethers.connectProviderWithWssUrlOrRetryForever();
      const blockNumber = await ethers.provider.getBlockNumber();
      expect(typeof blockNumber).toBe('number');
      ethers.disposeCurrentProvider();
    });
    it('should throw an error if the connection fails', async () => {
      const connectProviderMock = jest
        .fn()
        .mockRejectedValue(new ConnectionTimeoutException());
      ethers.connectProviderWithWssUrlOrRetryForever = connectProviderMock;

      await expect(
        ethers.connectProviderWithWssUrlOrRetryForever(),
      ).rejects.toThrow(new ConnectionTimeoutException());
    });
  });

  describe('disposeCurrentProvider', () => {
    it('should dipose the provider', async () => {
      ethers.provider = {
        destroy: jest.fn(),
      } as unknown as ethers.providers.WebSocketProvider;
      await ethers.connectProviderWithWssUrlOrRetryForever();
      await ethers.disposeCurrentProvider();
      expect(await ethers.provider.ready).toBe(false);
    });
  });
});
