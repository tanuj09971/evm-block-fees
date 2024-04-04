import { Test, TestingModule } from '@nestjs/testing';
import { Ethers } from './ethers';

describe('Ethers', () => {
  let provider: Ethers;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Ethers],
    }).compile();

    provider = module.get<Ethers>(Ethers);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
