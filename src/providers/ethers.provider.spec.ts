import { Test, TestingModule } from '@nestjs/testing';
import { EthersProvider } from './ethers.provider';
import { AppConfigModule } from '../config/config.module';

describe('EthersProvider', () => {
  let provider: EthersProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EthersProvider, AppConfigModule],
    }).compile();

    provider = module.get<EthersProvider>(EthersProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should initialize the WebSocketProvider with a valid WSS URL', async () => {
    await provider.onModuleInit(); 
  });
});
