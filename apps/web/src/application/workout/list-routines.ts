/**
 * List Routines use case (L2 Application)
 */

import type { RoutineRepository } from '@/domain/workout/ports';
import type { Routine } from '@/domain/workout/entities';
import type { Logger } from '@/domain/shared/logger';
import type { Result } from '@/domain/shared/result';

export interface ListRoutinesDeps {
  routineRepository: RoutineRepository;
  logger: Logger;
}

export const createListRoutinesUseCase = (deps: ListRoutinesDeps) => {
  return async (): Promise<Result<Routine[]>> => {
    deps.logger.info('Listing routines');

    const result = await deps.routineRepository.list();

    if (result.ok) {
      deps.logger.info('Routines listed successfully', { count: result.value.length });
    } else {
      deps.logger.error('Failed to list routines', undefined, {
        error: result.error,
      });
    }

    return result;
  };
};
