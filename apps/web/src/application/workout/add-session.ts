/**
 * Add Workout Session use case (L2 Application)
 */

import type { SessionRepository } from '@/domain/workout/ports';
import type { WorkoutSession } from '@/domain/workout/entities';
import type { Clock } from '@/domain/shared/clock';
import type { IdGenerator } from '@/domain/shared/id-generator';
import type { Logger } from '@/domain/shared/logger';
import type { Result } from '@/domain/shared/result';

export interface AddSessionDeps {
  sessionRepository: SessionRepository;
  clock: Clock;
  idGenerator: IdGenerator;
  logger: Logger;
}

export interface AddSessionInput {
  date: string;
  startTime: string;
  endTime: string;
  routineRef?: string;
  exerciseBlocks: Array<{
    position: number;
    exerciseName: string;
    exerciseRef: {
      source: 'free-exercise-db' | 'wger' | 'custom';
      id: string;
    };
    sets: Array<{
      setIndex: number;
      weightKg: number;
      reps: number;
      restSec?: number;
      rpe?: number;
    }>;
  }>;
  note?: string;
  estKcalBurned?: number;
}

export const createAddSessionUseCase = (deps: AddSessionDeps) => {
  return async (input: AddSessionInput): Promise<Result<string>> => {
    deps.logger.info('Adding workout session', { date: input.date });

    const id = deps.idGenerator.generate();

    const session: WorkoutSession = {
      id,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      routineRef: input.routineRef,
      exerciseBlocks: input.exerciseBlocks,
      note: input.note,
      estKcalBurned: input.estKcalBurned,
      schemaVersion: 1,
    };

    const result = await deps.sessionRepository.add(session);

    if (result.ok) {
      deps.logger.info('Workout session added successfully', { id });
      return { ok: true, value: id };
    } else {
      deps.logger.error('Failed to add workout session', undefined, {
        error: result.error,
      });
      return result;
    }
  };
};
