import { Test, TestingModule } from '@nestjs/testing';
import { BlockStatsService } from './block-stats.service';

describe('BlockStatsService', () => {
  let service: BlockStatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlockStatsService],
    }).compile();

    service = module.get<BlockStatsService>(BlockStatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
