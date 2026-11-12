/**
 * Add Body Measurement use case (L2 Application)
 */

import type { BodyRepository } from '@/domain/body/ports';
import type { BodyMeasurement } from '@/domain/body/entities';
import type { Clock } from '@/domain/shared/clock';
import type { IdGenerator } from '@/domain/shared/id-generator';
import type { Logger } from '@/domain/shared/logger';
import type { Result } from '@/domain/shared/result';

export interface AddMeasurementDeps {
  bodyRepository: BodyRepository;
  clock: Clock;
  idGenerator: IdGenerator;
  logger: Logger;
}

export interface AddMeasurementInput {
  date: string;
  weightKg: number;
  heightCm: number;
  bodyFatPct?: number;
  bodyFatMethod?: 'bia' | 'caliper' | 'dexa' | 'estimate';
  note?: string;
}

export const createAddMeasurementUseCase = (deps: AddMeasurementDeps) => {
  return async (input: AddMeasurementInput): Promise<Result<string>> => {
    deps.logger.info('Adding body measurement', { date: input.date });

    const id = deps.idGenerator.generate();

    const measurement: BodyMeasurement = {
      id,
      date: input.date,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      bodyFatPct: input.bodyFatPct,
      bodyFatMethod: input.bodyFatMethod,
      note: input.note,
      schemaVersion: 1,
    };

    const result = await deps.bodyRepository.add(measurement);

    if (result.ok) {
      deps.logger.info('Body measurement added successfully', { id });
      return { ok: true, value: id };
    } else {
      deps.logger.error('Failed to add body measurement', undefined, {
        error: result.error,
      });
      return result;
    }
  };
};
