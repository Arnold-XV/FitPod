/**
 * Workout validators (L3)
 * AR-04: Pure validation, SRS 4.5 ranges
 */

import type { WorkoutSession, Routine, CustomExercise, SetLog, ExerciseBlock } from './entities';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ══════════════════════════════════════════════════
// Session Validation
// ══════════════════════════════════════════════════

export const validateSession = (s: Partial<WorkoutSession>): ValidationResult => {
  const errors: string[] = [];
  
  // Required fields
  if (!s.date) errors.push('date required');
  if (!s.startTime) errors.push('startTime required');
  if (!s.endTime) errors.push('endTime required');
  
  // Time validation
  if (s.startTime && s.endTime) {
    const start = new Date(s.startTime);
    const end = new Date(s.endTime);
    
    if (isNaN(start.getTime())) errors.push('startTime invalid');
    if (isNaN(end.getTime())) errors.push('endTime invalid');
    
    if (end <= start) {
      errors.push('endTime must be after startTime');
    }
    
    // No timestamp >24h in future (SRS 4.5)
    const now = new Date();
    const future24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (start > future24h) errors.push('startTime cannot be >24h in future');
    if (end > future24h) errors.push('endTime cannot be >24h in future');
  }
  
  // Exercise blocks
  if (!s.exerciseBlocks || s.exerciseBlocks.length === 0) {
    errors.push('at least one exercise required');
  } else {
    s.exerciseBlocks.forEach((block, i) => {
      const blockErrors = validateExerciseBlock(block, i);
      errors.push(...blockErrors);
    });
  }
  
  // Optional calorie estimate
  if (s.estKcalBurned !== undefined && s.estKcalBurned < 0) {
    errors.push('estKcalBurned cannot be negative');
  }
  
  return { valid: errors.length === 0, errors };
};

export const validateExerciseBlock = (block: ExerciseBlock, blockIndex: number): string[] => {
  const errors: string[] = [];
  
  if (!block.exerciseName) {
    errors.push(`block ${blockIndex}: exerciseName required`);
  }
  
  if (!block.exerciseRef) {
    errors.push(`block ${blockIndex}: exerciseRef required`);
  } else {
    if (!block.exerciseRef.source) {
      errors.push(`block ${blockIndex}: exerciseRef.source required`);
    }
    if (!block.exerciseRef.id) {
      errors.push(`block ${blockIndex}: exerciseRef.id required`);
    }
  }
  
  if (!block.sets || block.sets.length === 0) {
    errors.push(`block ${blockIndex}: at least one set required`);
  } else {
    block.sets.forEach((set, j) => {
      const setErrors = validateSetLog(set, blockIndex, j);
      errors.push(...setErrors);
    });
  }
  
  return errors;
};

export const validateSetLog = (set: SetLog, blockIndex: number, setIndex: number): string[] => {
  const errors: string[] = [];
  const prefix = `block ${blockIndex} set ${setIndex}`;
  
  // SRS 4.5: weightKg 0-1000
  if (set.weightKg === undefined || set.weightKg === null) {
    errors.push(`${prefix}: weightKg required`);
  } else if (set.weightKg < 0 || set.weightKg > 1000) {
    errors.push(`${prefix}: weightKg must be 0-1000`);
  }
  
  // SRS 4.5: reps 0-1000
  if (set.reps === undefined || set.reps === null) {
    errors.push(`${prefix}: reps required`);
  } else if (set.reps < 0 || set.reps > 1000) {
    errors.push(`${prefix}: reps must be 0-1000`);
  }
  
  // SRS 4.5: restSec 0-7200 (optional)
  if (set.restSec !== undefined) {
    if (set.restSec < 0 || set.restSec > 7200) {
      errors.push(`${prefix}: restSec must be 0-7200`);
    }
  }
  
  // SRS 4.5: rpe 1-10 (optional)
  if (set.rpe !== undefined) {
    if (set.rpe < 1 || set.rpe > 10) {
      errors.push(`${prefix}: rpe must be 1-10`);
    }
  }
  
  return errors;
};

// ══════════════════════════════════════════════════
// Routine Validation
// ══════════════════════════════════════════════════

export const validateRoutine = (r: Partial<Routine>): ValidationResult => {
  const errors: string[] = [];
  
  if (!r.name || r.name.trim().length === 0) {
    errors.push('name required');
  } else if (r.name.length > 100) {
    errors.push('name max 100 characters');
  }
  
  if (!r.createdBy) {
    errors.push('createdBy (WebID) required');
  }
  
  // Days of week: 1-7
  if (r.daysOfWeek) {
    r.daysOfWeek.forEach(day => {
      if (day < 1 || day > 7) {
        errors.push(`daysOfWeek must be 1-7, got ${day}`);
      }
    });
  }
  
  // Items
  if (!r.items || r.items.length === 0) {
    errors.push('at least one routine item required');
  } else {
    r.items.forEach((item, i) => {
      if (!item.exerciseName) errors.push(`item ${i}: exerciseName required`);
      if (!item.exerciseRef) errors.push(`item ${i}: exerciseRef required`);
      
      if (item.targetSets !== undefined && (item.targetSets < 0 || item.targetSets > 1000)) {
        errors.push(`item ${i}: targetSets 0-1000`);
      }
      if (item.targetReps !== undefined && (item.targetReps < 0 || item.targetReps > 1000)) {
        errors.push(`item ${i}: targetReps 0-1000`);
      }
      if (item.targetWeightKg !== undefined && (item.targetWeightKg < 0 || item.targetWeightKg > 1000)) {
        errors.push(`item ${i}: targetWeightKg 0-1000`);
      }
    });
  }
  
  return { valid: errors.length === 0, errors };
};

// ══════════════════════════════════════════════════
// Custom Exercise Validation
// ══════════════════════════════════════════════════

export const validateCustomExercise = (e: Partial<CustomExercise>): ValidationResult => {
  const errors: string[] = [];
  
  if (!e.name || e.name.trim().length === 0) {
    errors.push('name required');
  } else if (e.name.length > 100) {
    errors.push('name max 100 characters');
  }
  
  return { valid: errors.length === 0, errors };
};
