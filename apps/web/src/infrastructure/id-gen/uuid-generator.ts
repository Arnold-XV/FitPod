/**
 * UUID Generator implementation (L5)
 * AR-04: ID Generator port implementation
 */

import type { IdGenerator } from '@/domain/shared/id-generator';

class UuidGenerator implements IdGenerator {
  generate(): string {
    return crypto.randomUUID();
  }
}

export const createIdGenerator = (): IdGenerator => {
  return new UuidGenerator();
};
