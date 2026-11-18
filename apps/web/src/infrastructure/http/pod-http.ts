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
  retryEnabled?: boolean;
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

class PodHttpImpl implements PodHttp {
  private authedFetch: typeof fetch;
  private limiter: ReturnType<typeof pLimit>;
  private timeout: number;
  private retryEnabled: boolean;
  private maxRetries: number;
  private baseDelay: number;
  private maxDelay: number;

  constructor(config: PodHttpConfig) {
    this.authedFetch = config.authedFetch;
    this.limiter = pLimit(config.concurrencyLimit ?? 6); // SAD F3: 6 parallel
    this.timeout = config.timeout ?? 5000; // SAD F3: 5s timeout
    this.retryEnabled = config.retryEnabled ?? true;
    this.maxRetries = config.maxRetries ?? 3;
    this.baseDelay = config.baseDelay ?? 100;
    this.maxDelay = config.maxDelay ?? 2000;
  }

  async authed(url: string, init?: RequestInit): Promise<Response> {
    return this.limiter(() => this.fetchWithRetry(url, init, this.authedFetch));
  }

  async plain(url: string, init?: RequestInit): Promise<Response> {
    // AR-22: credentials: 'omit', no Authorization
    const plainInit: RequestInit = {
      ...init,
      credentials: 'omit',
    };
    return this.limiter(() => this.fetchWithRetry(url, plainInit, fetch));
  }

  /**
   * Fetch with retry/backoff for transient failures (429, 503, 504).
   * AR-23: Retry with exponential backoff
   */
  private async fetchWithRetry(
    url: string,
    init: RequestInit | undefined,
    fetchFn: typeof fetch
  ): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, init, fetchFn);
        
        // Only retry on transient failures
        if (this.retryEnabled && 
            (response.status === 429 || response.status === 503 || response.status === 504)) {
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          const delay = this.calculateDelay(attempt);
          console.log(`[HTTP] Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms (status: ${response.status})`);
          await this.sleep(delay);
          continue;
        }
        
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Retry on network errors (timeout is already handled by fetchWithTimeout)
        if (this.retryEnabled && attempt < this.maxRetries) {
          const delay = this.calculateDelay(attempt);
          console.log(`[HTTP] Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms (error: ${lastError.message})`);
          await this.sleep(delay);
          continue;
        }
        
        throw lastError;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Calculate exponential backoff delay with jitter.
   */
  private calculateDelay(attempt: number): number {
    const delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);
    // Add 10% jitter
    return delay * (0.9 + Math.random() * 0.2);
  }

  /**
   * Sleep helper for retries.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
