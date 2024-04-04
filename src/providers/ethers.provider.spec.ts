import { Test, TestingModule } from '@nestjs/testing';
import { EthersProvider } from './ethers.provider';

describe('EthersProvider', () => {
  let provider: EthersProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EthersProvider],
    }).compile();

    provider = module.get<EthersProvider>(EthersProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
