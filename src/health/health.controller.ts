import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
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
    private blockCacheService: BlockCacheService,
    private blockAnalyticsCacheService: BlockAnalyticsCacheService,
  ) {}


  @Get()
  @HealthCheck()
  healthCheck(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.web3ProxyHealthCheck.bind(this)(),
      () => this.ethBlockNumberHealthCheck.bind(this)(),
      () => this.blockCacheHealthCheck.bind(this)(),
      () => this.analyticsCacheHealthCheck(1),
      () => this.analyticsCacheHealthCheck(5),
      () => this.analyticsCacheHealthCheck(30),
    ]);
  }

  // Health check functions
  private web3ProxyHealthCheck(): Promise<HealthIndicatorResult> {
    return this.http.responseCheck(
      'web3-proxy',
      `${this.web3ProxyUrl}/health`,
      (response) => response.status === 200,
    );
  }

  private ethBlockNumberHealthCheck(): Promise<HealthIndicatorResult> {
    return this.http.responseCheck(
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
    );
  }
  private blockCacheHealthCheck = (): HealthIndicatorResult => {
    const status = this.blockCacheService.isCacheStale() ? 'down' : 'up';
    return { 'block-cache-stale': { status } };
  };

  private analyticsCacheHealthCheck = async (
    n: number,
  ): Promise<HealthIndicatorResult> => {
    const status = (await this.checkAnalyticsCache(n)) ? 'up' : 'down';
    return {
      [`analytics-cache-${n}-block`]: {
        status,
      },
    };
  };

  private checkAnalyticsCache(n: number): boolean {
    try {
      this.blockAnalyticsCacheService.getStatsForLatestNBlocks(n);
      return true;
    } catch (error) {
      return false;
    }
  }
}
