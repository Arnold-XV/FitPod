/**
 * Health module entities (L3 Domain)
 * PAR-Q+ screening for exercise readiness
 */

export interface ParQResponse {
  id: string;
  date: string; // ISO date
  responses: {
    q1: boolean; // Heart disease
    q2: boolean; // Chest pain
    q3: boolean; // Dizziness/fainting
    q4: boolean; // Medication for BP/heart
    q5: boolean; // Bone/joint problems
    q6: boolean; // Doctor advised no exercise
    q7: boolean; // Other medical conditions
  };
  followUpCompleted: boolean; // If any true, needs follow-up
  professionalClearance?: {
    cleared: boolean;
    clearedBy: string; // Professional WebID
    clearedAt: string;
    notes?: string;
  };
  schemaVersion: number;
}

export const validateParQResponse = (
  parq: Partial<ParQResponse>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!parq.date) errors.push('date required');
  if (!parq.responses) errors.push('responses required');
  
  return { valid: errors.length === 0, errors };
};
