import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ethers } from 'ethers';
import { EthersProvider } from './ethers.provider';

describe('EthersProvider', () => {
  let provider: EthersProvider;
  let configServiceMock: ConfigService;

  beforeEach(async () => {
    configServiceMock = { get: { mockReturnValue: jest.fn() } } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EthersProvider,
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    provider = module.get<EthersProvider>(EthersProvider);
    const mockUrl =
      'wss://sepolia.infura.io/v3/4e65725048f74194b9f4079e23a8a964';
    configServiceMock.get = jest.fn().mockReturnValue(mockUrl);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('initiateProviderWithWssUrl', () => {
    it('should call the method and log the URL', async () => {
      const initiateSpy = jest.spyOn(provider, 'initiateProviderWithWssUrl');
      await provider.initiateProviderWithWssUrl();

      expect(initiateSpy).toHaveBeenCalled();
      expect(configServiceMock.get).toHaveBeenCalledWith('ws_or_wss_web3_url');
      await provider.disposeCurrentProvider();
    });
  });

  describe('disposeCurrentProvider', () => {
    it('should call the method and log the URL', async () => {
      const initiateSpy = jest.spyOn(provider, 'initiateProviderWithWssUrl');
      await provider.initiateProviderWithWssUrl();

      expect(initiateSpy).toHaveBeenCalled();
      expect(configServiceMock.get).toHaveBeenCalledWith('ws_or_wss_web3_url');
      await provider.disposeCurrentProvider();
    });
  });

  describe('setOnErrorListener', () => {
    it('should log errors', async () => {
      let ethersProvider = {
        on: jest.fn(),
      } as unknown as ethers.providers.WebSocketProvider;

      ethersProvider = await provider.getProvider();

      await provider.initiateProviderWithWssUrl();
      await provider.setOnErrorListner();
      await provider.disposeCurrentProvider();
    });
  });

  describe('setOnBlockListener', () => {
    it('should log new blocks and emit via the observable', async () => {
      let ethersProvider = {
        on: jest.fn(),
      } as unknown as ethers.providers.WebSocketProvider;

      ethersProvider = await provider.getProvider();

      await provider.initiateProviderWithWssUrl();
      await provider.setOnBlockListner();

      await provider.disposeCurrentProvider();
    });
  });
});
