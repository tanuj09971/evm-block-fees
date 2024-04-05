import { Test, TestingModule } from '@nestjs/testing';
import { BlockFeesService } from './block-fees.service';

describe('BlockFeesService', () => {
  let service: BlockFeesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlockFeesService],
    }).compile();

    service = module.get<BlockFeesService>(BlockFeesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
