import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BlockFeesService } from './block-fees/block-fees.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, BlockFeesService],
})
export class AppModule {}
