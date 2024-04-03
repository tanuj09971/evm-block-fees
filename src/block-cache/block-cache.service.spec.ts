import { Test, TestingModule } from '@nestjs/testing';
import { BlockCacheService } from './block-cache.service';

describe('BlockCacheService', () => {
  let service: BlockCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlockCacheService],
    }).compile();

    service = module.get<BlockCacheService>(BlockCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
