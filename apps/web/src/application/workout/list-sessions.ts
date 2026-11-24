/**
 * List Workout Sessions use case (L2 Application)
 */

import type { SessionRepository } from '@/domain/workout/ports';
import type { WorkoutSession } from '@/domain/workout/entities';
import type { Logger } from '@/domain/shared/logger';
import type { Result } from '@/domain/shared/result';

export interface ListSessionsDeps {
  sessionRepository: SessionRepository;
  logger: Logger;
}

export interface ListSessionsInput {
  startDate?: string;
  endDate?: string;
}

export const createListSessionsUseCase = (deps: ListSessionsDeps) => {
  return async (input: ListSessionsInput = {}): Promise<Result<WorkoutSession[]>> => {
    deps.logger.info('Listing workout sessions');

    const range = input.startDate && input.endDate
      ? { start: input.startDate, end: input.endDate }
      : undefined;

    const result = await deps.sessionRepository.list(range);

    if (result.ok) {
      deps.logger.info('Workout sessions listed successfully', { count: result.value.length });
    } else {
      deps.logger.error('Failed to list workout sessions', undefined, {
        error: result.error,
      });
    }

    return result;
  };
};
