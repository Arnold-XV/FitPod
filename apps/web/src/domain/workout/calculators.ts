/**
 * Workout calculators (L3)
 * AR-04: Pure functions, FR-CALC-01
 */

import type { WorkoutSession, PersonalRecord, ExerciseRef } from './entities';

// ══════════════════════════════════════════════════
// Session Calculations
// ══════════════════════════════════════════════════

/**
 * Calculate total volume (sum of weight × reps for all sets)
 */
export const calculateVolume = (session: WorkoutSession): number => {
  return session.exerciseBlocks.reduce((total, block) => {
    const blockVolume = block.sets.reduce((sum, set) => 
      sum + (set.weightKg * set.reps), 0
    );
    return total + blockVolume;
  }, 0);
};

/**
 * Calculate duration in minutes
 */
export const calculateDuration = (session: WorkoutSession): number => {
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  return Math.floor((end.getTime() - start.getTime()) / 1000 / 60);
};

/**
 * Calculate duration in seconds
 */
export const calculateDurationSeconds = (session: WorkoutSession): number => {
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  return Math.floor((end.getTime() - start.getTime()) / 1000);
};

/**
 * Count total sets in session
 */
export const countTotalSets = (session: WorkoutSession): number => {
  return session.exerciseBlocks.reduce((total, block) => 
    total + block.sets.length, 0
  );
};

// ══════════════════════════════════════════════════
// 1RM Estimation (Epley Formula)
// ══════════════════════════════════════════════════

/**
 * Estimate 1RM using Epley formula
 * SRS: Only valid for ≤12 reps
 * Formula: weight × (1 + reps / 30)
 */
export const estimate1RM = (weightKg: number, reps: number): number | null => {
  if (reps > 12 || reps < 1) return null;
  return weightKg * (1 + reps / 30);
};

// ══════════════════════════════════════════════════
// Personal Records Derivation
// ══════════════════════════════════════════════════

/**
 * Derive personal records from session history
 * FR-PRG-04: Rebuildable from source data
 */
export const derivePersonalRecords = (sessions: WorkoutSession[]): PersonalRecord[] => {
  const recordMap = new Map<string, PersonalRecord[]>();
  
  // Sort sessions by date descending (newest first) for achievedAt accuracy
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );
  
  sortedSessions.forEach(session => {
    session.exerciseBlocks.forEach(block => {
      const key = exerciseRefToKey(block.exerciseRef);
      
      if (!recordMap.has(key)) {
        recordMap.set(key, []);
      }
      
      const records = recordMap.get(key)!;
      
      block.sets.forEach(set => {
        // Max Weight Record
        const maxWeightRecord = records.find(r => r.type === 'maxWeight');
        if (!maxWeightRecord || set.weightKg > maxWeightRecord.value) {
          // Remove old record
          const filtered = records.filter(r => r.type !== 'maxWeight');
          
          // Add new record
          filtered.push({
            exerciseRef: block.exerciseRef,
            type: 'maxWeight',
            value: set.weightKg,
            achievedAt: session.startTime,
            sessionRef: session.id
          });
          
          recordMap.set(key, filtered);
        }
        
        // Max Reps Record (at any weight)
        const maxRepsRecord = records.find(r => r.type === 'maxReps');
        if (!maxRepsRecord || set.reps > maxRepsRecord.value) {
          const filtered = records.filter(r => r.type !== 'maxReps');
          
          filtered.push({
            exerciseRef: block.exerciseRef,
            type: 'maxReps',
            value: set.reps,
            achievedAt: session.startTime,
            sessionRef: session.id
          });
          
          recordMap.set(key, filtered);
        }
        
        // Estimated 1RM Record
        const est1RM = estimate1RM(set.weightKg, set.reps);
        if (est1RM !== null) {
          const max1RMRecord = records.find(r => r.type === 'est1RM');
          if (!max1RMRecord || est1RM > max1RMRecord.value) {
            const filtered = records.filter(r => r.type !== 'est1RM');
            
            filtered.push({
              exerciseRef: block.exerciseRef,
              type: 'est1RM',
              value: est1RM,
              achievedAt: session.startTime,
              sessionRef: session.id
            });
            
            recordMap.set(key, filtered);
          }
        }
      });
    });
  });
  
  return Array.from(recordMap.values()).flat();
};

/**
 * Helper: Convert ExerciseRef to unique key
 */
export const exerciseRefToKey = (ref: ExerciseRef): string => {
  return `${ref.source}:${ref.id}`;
};

/**
 * Helper: Parse key back to ExerciseRef
 */
export const keyToExerciseRef = (key: string): ExerciseRef | null => {
  const [source, id] = key.split(':');
  if (!source || !id) return null;
  
  const validSources = ['free-exercise-db', 'wger', 'custom'];
  if (!validSources.includes(source)) return null;
  
  return { source: source as ExerciseRef['source'], id };
};

// ══════════════════════════════════════════════════
// Cache Hash (for invalidation)
// ══════════════════════════════════════════════════

/**
 * Compute hash of session IDs for cache invalidation
 * FR-PRG-04: Rebuild when hash differs
 */
export const computeSessionsHash = (sessions: WorkoutSession[]): string => {
  const ids = sessions.map(s => s.id).sort().join(',');
  
  // Simple hash for MVP (real: use Web Crypto SHA-256)
  let hash = 0;
  for (let i = 0; i < ids.length; i++) {
    const char = ids.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16);
};

/**
 * Async version using Web Crypto (for production)
 */
export const computeSessionsHashCrypto = async (sessions: WorkoutSession[]): Promise<string> => {
  const ids = sessions.map(s => s.id).sort().join(',');
  const encoder = new TextEncoder();
  const data = encoder.encode(ids);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
