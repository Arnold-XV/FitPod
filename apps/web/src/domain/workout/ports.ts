/**
 * Workout ports (L3)
 * AR-04: Interface definitions, no implementation
 */

import type { Result } from '../shared/result';
import type { 
  WorkoutSession, 
  Routine, 
  CustomExercise, 
  ProgressRecords, 
  BundledExercise, 
  SessionDraft 
} from './entities';

// ══════════════════════════════════════════════════
// Repository Ports
// ══════════════════════════════════════════════════

export interface SessionRepository {
  add(session: WorkoutSession): Promise<Result<void>>;
  update(session: WorkoutSession): Promise<Result<void>>;
  delete(id: string): Promise<Result<void>>;
  get(id: string): Promise<Result<WorkoutSession>>;
  list(range?: { start: string; end: string }): Promise<Result<WorkoutSession[]>>;
}

export interface RoutineRepository {
  add(routine: Routine): Promise<Result<void>>;
  update(routine: Routine): Promise<Result<void>>;
  delete(id: string): Promise<Result<void>>;
  get(id: string): Promise<Result<Routine>>;
  list(): Promise<Result<Routine[]>>;
}

export interface CustomExerciseRepository {
  add(exercise: CustomExercise): Promise<Result<void>>;
  update(exercise: CustomExercise): Promise<Result<void>>;
  delete(id: string): Promise<Result<void>>;
  get(id: string): Promise<Result<CustomExercise>>;
  list(): Promise<Result<CustomExercise[]>>;
}

export interface RecordsRepository {
  get(): Promise<Result<ProgressRecords>>;
  rebuild(sessions: WorkoutSession[]): Promise<Result<void>>;
}

// ══════════════════════════════════════════════════
// Infrastructure Ports
// ══════════════════════════════════════════════════

export interface ExerciseLibrary {
  load(): Promise<BundledExercise[]>;
  search(query: string, limit?: number): BundledExercise[];
  getById(id: string): BundledExercise | null;
  filter(criteria: {
    equipment?: string;
    category?: string;
    bodyPart?: string;
    primaryMuscle?: string;
  }, limit?: number): BundledExercise[];
  getUniqueEquipment(): string[];
  getUniqueCategories(): string[];
  getUniqueBodyParts(): string[];
  isLoaded(): boolean;
  count(): number;
}

export interface DraftStore {
  save(draft: SessionDraft): Promise<void>;
  load(): Promise<SessionDraft | null>;
  clear(): Promise<void>;
  hasDraft(): Promise<boolean>;
}
