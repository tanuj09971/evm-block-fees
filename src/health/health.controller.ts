import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { AxiosResponse } from 'axios';
import { BlockAnalyticsCacheService } from '../block-analytics-cache/block-analytics-cache.service';
import { BlockCacheService } from '../block-cache/block-cache.service';

@Controller({ path: 'health', version: '1' })
export class HealthController {
  web3ProxyUrl: string =
    this.configService.getOrThrow<string>('HTTPS_WEB3_URL');
  cacheKey: string;
  blockInterval: number =
    this.configService.getOrThrow<number>('block_interval');

  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private readonly configService: ConfigService,
    private readonly blockCacheService: BlockCacheService, // Inject services
    private readonly blockAnalyticsCacheService: BlockAnalyticsCacheService,
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
      () => ({
        'block-cache-stale': {
          status: this.blockCacheService.isCacheStale() ? 'down' : 'up',
        },
      }),

      // Analytics Cache Checks
      () => ({
        'analytics-cache-1-block': {
          status: this.checkAnalyticsCache(1) ? 'up' : 'down',
        },
      }),
      () => ({
        'analytics-cache-5-blocks': {
          status: this.checkAnalyticsCache(5) ? 'up' : 'down',
        },
      }),
      () => ({
        'analytics-cache-30-blocks': {
          status: this.checkAnalyticsCache(30) ? 'up' : 'down',
        },
      }),
    ]);
  }

  private checkAnalyticsCache(n: number): boolean {
    try {
      this.blockAnalyticsCacheService.getStatsForLatestNBlocks(n);
      return true;
    } catch (error) {
      return false;
    }
  }
}
