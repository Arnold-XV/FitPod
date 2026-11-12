/**
 * Console Logger implementation (L5)
 * AR-15: No tokens, no health values in logs
 */

import type { Logger, LogLevel } from '@/domain/shared/logger';

class ConsoleLogger implements Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, context ? this.sanitize(context) : '');
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, context ? this.sanitize(context) : '');
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, context ? this.sanitize(context) : '');
    }
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, error, context ? this.sanitize(context) : '');
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private sanitize(context: Record<string, unknown>): Record<string, unknown> {
    // AR-15: Remove tokens and health values
    const sanitized = { ...context };
    const sensitiveKeys = ['token', 'authorization', 'password', 'secret'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}

export const createLogger = (level?: LogLevel): Logger => {
  return new ConsoleLogger(level);
};
