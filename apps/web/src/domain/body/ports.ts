/**
 * Body repository port (L3)
 * AR-16: Ports declared in L3, implemented in L4
 */

import type { Result } from '../shared/result';
import type { BodyMeasurement } from './entities';

export interface BodyRepository {
  list(monthsBack?: number): Promise<Result<BodyMeasurement[]>>;
  getById(id: string): Promise<Result<BodyMeasurement | null>>;
  add(measurement: BodyMeasurement): Promise<Result<void>>;
  update(measurement: BodyMeasurement): Promise<Result<void>>;
  remove(id: string, date?: string): Promise<Result<void>>;
  setWebId(webId: string): void;
  ensureStorageRoot(): Promise<void>;
  getStorageRoot(): string;
}
