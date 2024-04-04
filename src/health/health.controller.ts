import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { AxiosResponse } from 'axios';

@Controller({ path: 'health', version: '1' })
export class HealthController {
  web3ProxyUrl: string = this.configService.get<string>(
    'http_or_https_web3_url',
  ) as string;
  cacheKey: string;
  blockInterval: number = this.configService.get<number>(
    'block_interval',
  ) as number;

  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () =>
        this.http.responseCheck(
          'web3-proxy',
          `${this.web3ProxyUrl}/health`,
          (response) => {
            return response.status === 200;
          },
        ),
      () =>
        this.http.responseCheck(
          'eth-block-number',
          `${this.web3ProxyUrl}`,
          (response: AxiosResponse<any>) => {
            return response.status === 200;
          },
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_blockNumber',
              id: 1,
            }),
          },
        ),
    ]);
  }
}
