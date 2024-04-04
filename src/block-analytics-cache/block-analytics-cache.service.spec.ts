import { Test, TestingModule } from '@nestjs/testing';
import { BlockAnalyticsCacheService } from './block-analytics-cache.service';

describe('BlockAnalyticsCacheService', () => {
  let service: BlockAnalyticsCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlockAnalyticsCacheService],
    }).compile();

    service = module.get<BlockAnalyticsCacheService>(BlockAnalyticsCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
