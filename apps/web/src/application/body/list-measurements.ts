/**
 * List Body Measurements use case (L2 Application)
 */

import type { BodyRepository } from '@/domain/body/ports';
import type { BodyMeasurement } from '@/domain/body/entities';
import type { Logger } from '@/domain/shared/logger';
import type { Result } from '@/domain/shared/result';

export interface ListMeasurementsDeps {
  bodyRepository: BodyRepository;
  logger: Logger;
}

export const createListMeasurementsUseCase = (deps: ListMeasurementsDeps) => {
  return async (): Promise<Result<BodyMeasurement[]>> => {
    deps.logger.info('Listing body measurements');

    const result = await deps.bodyRepository.list();

    if (result.ok) {
      deps.logger.info('Body measurements listed successfully', {
        count: result.value.length,
      });
    } else {
      deps.logger.error('Failed to list body measurements', undefined, {
        error: result.error,
      });
    }

    return result;
  };
};
