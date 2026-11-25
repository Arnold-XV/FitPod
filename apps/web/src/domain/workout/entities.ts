/**
 * Workout domain entities (L3)
 * AR-04: Pure, no I/O, no Date.now()
 */

// ══════════════════════════════════════════════════
// Core Session Entities
// ══════════════════════════════════════════════════

export interface WorkoutSession {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  startTime: string; // ISO dateTime with offset
  endTime: string; // ISO dateTime with offset
  routineRef?: string; // IRI to routine
  exerciseBlocks: ExerciseBlock[];
  note?: string; // Private, never shared
  estKcalBurned?: number; // Optional estimate
  schemaVersion: number; // Always 1 for MVP
}

export interface ExerciseBlock {
  position: number; // 1-based
  exerciseName: string; // Snapshot at time of session
  exerciseRef: ExerciseRef;
  sets: SetLog[];
}

export interface SetLog {
  setIndex: number; // 1-based
  weightKg: number; // 0-1000
  reps: number; // 0-1000
  restSec?: number; // 0-7200
  rpe?: number; // 1-10 (Rate of Perceived Exertion)
}

export interface ExerciseRef {
  source: 'free-exercise-db' | 'wger' | 'custom';
  id: string;
}

// ══════════════════════════════════════════════════
// Routine Entities
// ══════════════════════════════════════════════════

export interface Routine {
  id: string;
  name: string; // Max 100 chars
  daysOfWeek?: number[]; // 1=Monday, 7=Sunday
  createdBy: string; // WebID
  sourcePrescription?: string; // IRI if imported from trainer
  items: RoutineItem[];
  schemaVersion: number;
}

export interface RoutineItem {
  position: number; // 1-based
  exerciseName: string; // Snapshot
  exerciseRef: ExerciseRef;
  targetSets?: number; // 0-1000
  targetReps?: number; // 0-1000
  targetWeightKg?: number; // 0-1000
}

// ══════════════════════════════════════════════════
// Custom Exercise
// ══════════════════════════════════════════════════

export interface CustomExercise {
  id: string;
  name: string; // Max 100 chars
  primaryMuscles?: string[];
  equipment?: string;
  note?: string;
  schemaVersion: number;
}

// ══════════════════════════════════════════════════
// Progress Records (Derived)
// ══════════════════════════════════════════════════

export interface PersonalRecord {
  exerciseRef: ExerciseRef;
  type: 'maxWeight' | 'maxReps' | 'est1RM';
  value: number;
  achievedAt: string; // ISO dateTime
  sessionRef: string; // IRI
}

export interface ProgressRecords {
  records: PersonalRecord[];
  sourceHash: string; // SHA-256 of session IDs
  computedAt: string;
  schemaVersion: number;
}

// ══════════════════════════════════════════════════
// Exercise Library (from bundled DB)
// ══════════════════════════════════════════════════

export interface BundledExercise {
  id: string;
  name: string;
  category: string;
  body_part: string;
  equipment: string;
  instructions: string; // English text
  muscle_group: string;
  secondary_muscles: string[];
  target: string;
}

// ══════════════════════════════════════════════════
// Draft Session (IndexedDB only, not in Pod)
// ══════════════════════════════════════════════════

export interface SessionDraft {
  draft: Partial<WorkoutSession>;
  savedAt: string;
  checkpointCount: number;
}

// ══════════════════════════════════════════════════
// View Models (derived for UI)
// ══════════════════════════════════════════════════

export interface SessionSummary {
  id: string;
  date: string;
  durationMinutes: number;
  totalVolumeKg: number;
  exerciseCount: number;
  setCount: number;
}

export interface ExerciseHistory {
  exerciseRef: ExerciseRef;
  exerciseName: string;
  sessions: Array<{
    sessionId: string;
    date: string;
    maxWeight: number;
    totalVolume: number;
    sets: number;
  }>;
  personalRecord?: PersonalRecord;
}
