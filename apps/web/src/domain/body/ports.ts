/**
 * Body repository port (L3)
 * AR-16: Port dideklarasikan di L3, diimplementasi di L4
 */

import type { Result } from '../shared/result';
import type { BodyMeasurement } from './entities';

export interface BodyRepository {
  list(): Promise<Result<BodyMeasurement[]>>;
  getById(id: string): Promise<Result<BodyMeasurement | null>>;
  add(measurement: BodyMeasurement): Promise<Result<void>>;
  update(measurement: BodyMeasurement): Promise<Result<void>>;
  remove(id: string): Promise<Result<void>>;
}
