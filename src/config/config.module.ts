import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import CONFIG from './configuration';

const CONFIG_SCHEMA = Joi.object({
  port: Joi.number().integer(),
  WSS_WEB3_URL: Joi.string().uri(),
  // http_or_https_web3_url: Joi.string().uri(),
  // block_interval: Joi.number().integer(),
});

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: false,
      load: [CONFIG],
      validationSchema: CONFIG_SCHEMA,
      isGlobal: true,
    }),
  ],
})
export class AppConfigModule {}
