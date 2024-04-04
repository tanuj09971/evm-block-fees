import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
  providers: [ConfigService],
})
export class HealthModule {}
