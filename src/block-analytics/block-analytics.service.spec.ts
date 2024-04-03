import { Test, TestingModule } from '@nestjs/testing';
import { BlockAnalyticsService } from './block-analytics.service';

describe('BlockAnalyticsService', () => {
  let service: BlockAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlockAnalyticsService],
    }).compile();

    service = module.get<BlockAnalyticsService>(BlockAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
