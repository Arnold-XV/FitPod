/**
 * Workout domain module exports
 */

// Entities
export type {
  WorkoutSession,
  ExerciseBlock,
  SetLog,
  ExerciseRef,
  Routine,
  RoutineItem,
  CustomExercise,
  PersonalRecord,
  ProgressRecords,
  BundledExercise,
  SessionDraft,
  SessionSummary,
  ExerciseHistory,
} from './entities';

// Validators
export {
  validateSession,
  validateExerciseBlock,
  validateSetLog,
  validateRoutine,
  validateCustomExercise,
} from './validators';

export type { ValidationResult } from './validators';

// Calculators
export {
  calculateVolume,
  calculateDuration,
  calculateDurationSeconds,
  countTotalSets,
  estimate1RM,
  derivePersonalRecords,
  exerciseRefToKey,
  keyToExerciseRef,
  computeSessionsHash,
  computeSessionsHashCrypto,
} from './calculators';

// Ports
export type {
  SessionRepository,
  RoutineRepository,
  CustomExerciseRepository,
  RecordsRepository,
  ExerciseLibrary,
  DraftStore,
} from './ports';
