/**
 * System Clock implementation (L5)
 * AR-04: Clock port implementation
 */

import type { Clock } from '@/domain/shared/clock';

class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  nowIso(): string {
    return new Date().toISOString();
  }
}

export const createClock = (): Clock => {
  return new SystemClock();
};
