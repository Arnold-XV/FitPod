// Re-export from access domain for convenience
import type { AccessScope, AccessPermission } from '../access/entities';
import type { ParQResponse } from '../health/entities';
export type { AccessScope, AccessPermission };

export interface ClientAccess {
  clientWebId: string; // WebID of user who granted access
  clientName?: string; // Extracted from profile
  scope: AccessScope[];
  permissions: AccessPermission;
  grantId: string;
  expiresAt?: string;
  grantedAt: string;
}

export interface ClientSummary {
  webId: string;
  name?: string;
  latestBodyData?: {
    date: string;
    weightKg: number;
    heightCm: number;
    bmi: number;
  };
  latestWorkoutDate?: string;
  accessScope: AccessScope[];
}

export interface RoutineRecommendation {
  id: string;
  clientWebId: string; // Target client
  professionalWebId: string; // Creator
  createdAt: string;
  status: 'pending' | 'applied' | 'rejected';
  appliedAt?: string;
  rejectedAt?: string;
  days: DayRoutine[]; // Can be 1-7 days
  notes?: string; // Professional notes to client
  schemaVersion: number;
}

export interface DayRoutine {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  name: string; // e.g., "Upper Body Day"
  exercises: ExerciseTemplate[];
}

export interface ExerciseTemplate {
  position: number;
  exerciseName: string;
  exerciseRef: ExerciseRef; // Reference to exercise database
  targetSets: number;
  targetReps: string; // e.g., "8-12", "AMRAP"
  targetWeightKg?: number;
  restSec?: number;
  notes?: string;
}

export interface ExerciseRef {
  source: 'wger' | 'custom';
  id: string;
}

// Extended ClientSummary with more details
export interface ClientDetail extends ClientSummary {
  parqResponse?: ParQResponse;
  currentRoutines?: ClientRoutineSummary[]; // Existing routines by day
  recommendations?: RoutineRecommendation[]; // Pending recommendations
}

export interface ClientRoutineSummary {
  dayOfWeek: number;
  routineName: string;
  routineId: string;
  exerciseCount: number;
}

export const validateRoutineRecommendation = (
  rec: Partial<RoutineRecommendation>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!rec.clientWebId) errors.push('clientWebId required');
  if (!rec.professionalWebId) errors.push('professionalWebId required');
  if (!rec.days || rec.days.length === 0) errors.push('At least one day required');
  if (rec.days && rec.days.length > 7) errors.push('Maximum 7 days');
  
  // Validate day uniqueness
  if (rec.days) {
    const daysSet = new Set(rec.days.map(d => d.dayOfWeek));
    if (daysSet.size !== rec.days.length) {
      errors.push('Duplicate days not allowed');
    }
  }
  
  // Validate exercises
  rec.days?.forEach((day, idx) => {
    if (day.exercises.length === 0) {
      errors.push(`Day ${idx}: At least one exercise required`);
    }
  });
  
  return { valid: errors.length === 0, errors };
};
