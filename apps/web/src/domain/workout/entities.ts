/**
 * Workout session entities (L3 Domain)
 * Based on SHACL shape and test structure
 */

export interface WorkoutSession {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  routineRef?: string;
  exerciseBlocks: ExerciseBlock[];
  note?: string;
  estKcalBurned?: number;
}

export interface ExerciseBlock {
  position: number;
  exerciseName: string;
  exerciseRef?: {
    source: 'free-exercise-db' | 'wger' | 'custom';
    id: string;
  };
  sets: SetLog[];
}

export interface SetLog {
  setIndex: number;
  weightKg: number;
  reps: number;
  restSec?: number;
  rpe?: number;
}

/**
 * Parse workout session from raw data
 */
export const parseWorkoutSession = (data: any, date: Date): WorkoutSession => {
  const session: WorkoutSession = {
    id: data.id || '',
    date: date,
    startTime: data.startTime ? new Date(data.startTime) : date,
    endTime: data.endTime ? new Date(data.endTime) : date,
    routineRef: data.routineRef,
    exerciseBlocks: data.exerciseBlocks || [],
    note: data.note,
    estKcalBurned: data.estKcalBurned,
  };
  return session;
};

/**
 * Serialize workout session for storage
 */
export const serializeWorkoutSession = (session: WorkoutSession): any => {
  return {
    id: session.id,
    date: session.date.toISOString(),
    startTime: session.startTime.toISOString(),
    endTime: session.endTime.toISOString(),
    routineRef: session.routineRef,
    exerciseBlocks: session.exerciseBlocks,
    note: session.note,
    estKcalBurned: session.estKcalBurned,
  };
};

/**
 * Calculate total volume for a session (kg)
 */
export const calculateSessionVolume = (session: WorkoutSession): number => {
  return session.exerciseBlocks.reduce((total, block) => {
    return total + block.sets.reduce((blockTotal, set) => {
      return blockTotal + (set.weightKg * set.reps);
    }, 0);
  }, 0);
};

/**
 * Validator for workout session
 */
export const validateWorkoutSession = (
  s: Partial<WorkoutSession>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!s.date) errors.push('date is required');
  if (!s.startTime) errors.push('startTime is required');
  if (!s.endTime) errors.push('endTime is required');
  if (!s.exerciseBlocks || s.exerciseBlocks.length === 0) {
    errors.push('at least one exercise is required');
  }

  if (s.note && s.note.length > 2000) {
    errors.push('note must be 2000 characters or less');
  }

  return { valid: errors.length === 0, errors };
};
