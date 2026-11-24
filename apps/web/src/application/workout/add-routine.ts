/**
 * Add Routine use case (L2 Application)
 */

import type { RoutineRepository } from '@/domain/workout/ports';
import type { Routine } from '@/domain/workout/entities';
import type { IdGenerator } from '@/domain/shared/id-generator';
import type { Logger } from '@/domain/shared/logger';
import type { Result } from '@/domain/shared/result';

export interface AddRoutineDeps {
  routineRepository: RoutineRepository;
  idGenerator: IdGenerator;
  logger: Logger;
  webId: string;
}

export interface AddRoutineInput {
  name: string;
  daysOfWeek?: number[];
  sourcePrescription?: string;
  items: Array<{
    position: number;
    exerciseName: string;
    exerciseRef: {
      source: 'free-exercise-db' | 'wger' | 'custom';
      id: string;
    };
    targetSets?: number;
    targetReps?: number;
    targetWeightKg?: number;
  }>;
}

export const createAddRoutineUseCase = (deps: AddRoutineDeps) => {
  return async (input: AddRoutineInput): Promise<Result<string>> => {
    deps.logger.info('Adding routine', { name: input.name });

    const id = deps.idGenerator.generate();

    const routine: Routine = {
      id,
      name: input.name,
      daysOfWeek: input.daysOfWeek,
      createdBy: deps.webId,
      sourcePrescription: input.sourcePrescription,
      items: input.items,
      schemaVersion: 1,
    };

    const result = await deps.routineRepository.add(routine);

    if (result.ok) {
      deps.logger.info('Routine added successfully', { id });
      return { ok: true, value: id };
    } else {
      deps.logger.error('Failed to add routine', undefined, {
        error: result.error,
      });
      return result;
    }
  };
};
