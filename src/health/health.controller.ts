import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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

interface EthBlockNumberResponse {
  jsonrpc: string;
  id: number;
  result: string;
}
@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  web3ProxyUrl: string =
    this.configService.getOrThrow<string>('HTTPS_WEB3_URL');
  cacheKey: string;
  blockInterval: number =
    this.configService.getOrThrow<number>('BLOCK_INTERVAL');
  private readonly analyticsCacheRanges: Array<number>;

  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private readonly configService: ConfigService,
    private blockCacheService: BlockCacheService,
    private blockAnalyticsCacheService: BlockAnalyticsCacheService,
  ) {
    this.analyticsCacheRanges = JSON.parse(
      this.configService.getOrThrow('BLOCK_RANGE'),
    );
  }

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Evm Block Fees Overall health check' })
  @ApiResponse({ status: 200, description: 'Healthy' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  healthCheck(): Promise<HealthCheckResult> {
    const healthChecks = [
      () => this.web3ProxyHealthCheck.bind(this)(),
      () => this.ethBlockNumberHealthCheck.bind(this)(),
      () => this.blockCacheHealthCheck.bind(this)(),
    ];
    // Dynamically create analyticsCacheHealthCheck calls
    this.analyticsCacheRanges.forEach((range) => {
      healthChecks.push(() => this.analyticsCacheHealthCheck(range));
    });

    return this.health.check(healthChecks);
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
      (response: AxiosResponse<EthBlockNumberResponse>) => {
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
    const status = this.checkAnalyticsCache(n) ? 'up' : 'down';
    return {
      [`analytics-cache-${n}-block`]: {
        status,
      },
    };
  };

  private checkAnalyticsCache(n: number): boolean {
    try {
      const blockStat = this.blockAnalyticsCacheService['statsCache'].get(n);
      return blockStat ? true : false;
    } catch (error) {
      return false;
    }
  }
}
