import { Test, TestingModule } from '@nestjs/testing';
import { BlockFeesController } from './block-fees.controller';
import { BlockFeesService } from './block-fees.service';

describe('BlockFeesController', () => {
  let controller: BlockFeesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockFeesController],
      providers: [BlockFeesService],
    }).compile();

    controller = module.get<BlockFeesController>(BlockFeesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
