import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import CONFIG from './configuration';

const CONFIG_SCHEMA = Joi.object({
  port: Joi.number().integer(),
  WSS_WEB3_URL: Joi.string().uri(),
  HTTPS_WEB3_URL: Joi.string().uri(),
  block_interval: Joi.number().integer(),
  MAX_CACHE_SIZE: Joi.number().integer(),
  block_range: Joi.array(),
});

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvVars: false,
      ignoreEnvFile: false,
      load: [CONFIG],
      validationSchema: CONFIG_SCHEMA,
      isGlobal: true,
    }),
  ],
})
export class AppConfigModule {}
