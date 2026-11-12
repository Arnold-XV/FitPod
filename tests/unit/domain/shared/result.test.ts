import { describe, it, expect } from 'vitest';
import { Result, AppError } from '../result';

describe('Result Type', () => {
  it('should create ok result', () => {
    const ok: Result<string> = { ok: true, value: 'hello' };
    expect(ok.ok).toBe(true);
    expect(ok.value).toBe('hello');
  });

  it('should create error result', () => {
    const error: Result<string> = { ok: false, error: new Error('test error') };
    expect(error.ok).toBe(false);
    expect(error.error.message).toBe('test error');
  });
});

describe('AppError Class', () => {
  it('should create AppError with code', () => {
    const err = new AppError('TEST_ERROR', 'Test message', 400);
    expect(err.code).toBe('TEST_ERROR');
    expect(err.message).toBe('Test message');
    expect(err.status).toBe(400);
  });

  it('should have proper name', () => {
    const err = new AppError('TEST', 'msg');
    expect(err.name).toBe('AppError');
  });
});