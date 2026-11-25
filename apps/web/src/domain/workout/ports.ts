/**
 * Workout ports and adapters (L3 Domain -> L2 Repository)
 */

import type { WorkoutSession, ExerciseBlock } from './entities';
import type { WorkoutSessionRecord } from '@/data/repositories/workout/workout-repository';

/**
 * Convert WorkoutSession (domain) to WorkoutSessionRecord (repository)
 */
export const toSessionRecord = (session: WorkoutSession, planId: number, planName: string, shared: boolean): WorkoutSessionRecord => {
  const sets: Record<string, { reps: string; weight: string }[]> = {};
  
  session.exerciseBlocks.forEach((block) => {
    sets[block.exerciseName] = block.sets.map((set) => ({
      reps: String(set.reps),
      weight: String(set.weightKg),
    }));
  });

  return {
    id: session.id,
    date: session.date.toISOString().slice(0, 10),
    planId,
    planName,
    day: session.date.toISOString().slice(0, 10),
    sets,
    shared,
  };
};

/**
 * Convert WorkoutSessionRecord (repository) to WorkoutSession (domain)
 */
export const fromSessionRecord = (record: WorkoutSessionRecord, startTime?: Date, endTime?: Date): WorkoutSession => {
  const date = new Date(record.date);
  
  const exerciseBlocks: ExerciseBlock[] = Object.entries(record.sets).map(([exerciseName, sets], index) => ({
    position: index + 1,
    exerciseName,
    sets: sets.map((set, idx) => ({
      setIndex: idx + 1,
      weightKg: Number(set.weight) || 0,
      reps: Number(set.reps) || 0,
    })),
  }));

  return {
    id: record.id,
    date,
    startTime: startTime || date,
    endTime: endTime || date,
    exerciseBlocks,
  };
};
