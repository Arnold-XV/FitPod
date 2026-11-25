import { describe, it, expect } from 'vitest';
import { success, failure, appError } from '@/domain/shared/result';
import type { Result, AppError } from '@/domain/shared/result';

describe('Result Type', () => {
  it('should create ok result', () => {
    const ok: Result<string> = success('hello');
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value).toBe('hello');
    }
  });

  it('should create error result', () => {
    const error: Result<string> = failure(appError('Unknown', 'test error'));
    expect(error.ok).toBe(false);
    if (!error.ok) {
      expect(error.error.message).toBe('test error');
    }
  });
});

describe('AppError', () => {
  it('should create AppError with type', () => {
    const err = appError('ValidationFailed', 'Test message', { field: 'name' });
    expect(err.type).toBe('ValidationFailed');
    expect(err.message).toBe('Test message');
    expect(err.details).toEqual({ field: 'name' });
  });

  it('should create AppError without details', () => {
    const err = appError('NotFound', 'Resource not found');
    expect(err.type).toBe('NotFound');
    expect(err.message).toBe('Resource not found');
    expect(err.details).toBeUndefined();
  });
});
