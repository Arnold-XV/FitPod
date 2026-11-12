/**
 * Pod HTTP wrapper - L5 Infrastructure
 * AR-03: Only L5/http calls fetch
 * AR-22: Dual fetch - authed for Pods, plain for external
 * Based on SAD 4.4
 */

import { appError, type Result, failure, success } from '@/domain/shared/result';
import pLimit from 'p-limit';

export interface PodHttp {
  authed(url: string, init?: RequestInit): Promise<Response>;
  plain(url: string, init?: RequestInit): Promise<Response>;
}

interface PodHttpConfig {
  authedFetch: typeof fetch;
  concurrencyLimit?: number;
  timeout?: number;
}

class PodHttpImpl implements PodHttp {
  private authedFetch: typeof fetch;
  private limiter: ReturnType<typeof pLimit>;
  private timeout: number;

  constructor(config: PodHttpConfig) {
    this.authedFetch = config.authedFetch;
    this.limiter = pLimit(config.concurrencyLimit ?? 6); // SAD F3: 6 parallel
    this.timeout = config.timeout ?? 5000; // SAD F3: 5s timeout
  }

  async authed(url: string, init?: RequestInit): Promise<Response> {
    return this.limiter(() => this.fetchWithTimeout(url, init, this.authedFetch));
  }

  async plain(url: string, init?: RequestInit): Promise<Response> {
    // AR-22: credentials: 'omit', no Authorization
    const plainInit: RequestInit = {
      ...init,
      credentials: 'omit',
    };
    return this.limiter(() => this.fetchWithTimeout(url, plainInit, fetch));
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit | undefined,
    fetchFn: typeof fetch
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetchFn(url, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const createPodHttp = (config: PodHttpConfig): PodHttp => {
  return new PodHttpImpl(config);
};

/**
 * Helper to convert HTTP response to Result
 */
export const handleHttpResponse = async <T>(
  response: Response,
  parser: (res: Response) => Promise<T>
): Promise<Result<T>> => {
  try {
    if (response.status === 401) {
      return failure(appError('SessionExpired', 'Session expired, please login again'));
    }

    if (response.status === 403) {
      return failure(appError('AccessDenied', 'Access denied'));
    }

    if (response.status === 404) {
      return failure(appError('NotFound', 'Resource not found'));
    }

    if (response.status === 409 || response.status === 412) {
      return failure(appError('Conflict', 'Resource conflict detected'));
    }

    if (response.status === 429) {
      return failure(appError('RateLimited', 'Rate limit exceeded'));
    }

    if (response.status >= 500) {
      return failure(appError('PodUnreachable', `Server error: ${response.status}`));
    }

    if (!response.ok) {
      return failure(appError('Unknown', `HTTP error: ${response.status}`));
    }

    const data = await parser(response);
    return success(data);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return failure(appError('PodUnreachable', 'Request timeout'));
      }
      return failure(appError('NetworkError', error.message, error));
    }
    return failure(appError('Unknown', 'Unknown error occurred'));
  }
};
