/**
 * Body measurement entities (L3 Domain)
 * Based on SAD 8.9
 */

export interface BodyMeasurement {
  id: string;
  date: string; // ISO date
  weightKg: number; // 20-400
  heightCm: number; // 50-260
  bodyFatPct?: number; // 0-100
  bodyFatMethod?: 'bia' | 'caliper' | 'dexa' | 'estimate';
  note?: string;
  provenance?: Provenance;
  schemaVersion: number;
}

export interface Provenance {
  trustLevel: 'self' | 'measured' | 'clinician';
  wasAttributedTo: string; // WebID
  method?: string;
  attestedBy?: string; // WebID
  attestedAt?: string; // ISO DateTime
  proofRef?: string;
  simulated?: boolean;
}

/**
 * Validator for body measurements
 * AR-04: L3 domain validation
 */
export const validateBodyMeasurement = (
  m: Partial<BodyMeasurement>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!m.date) errors.push('date is required');
  if (m.weightKg === undefined || m.weightKg === null) {
    errors.push('weightKg is required');
  } else if (m.weightKg < 20 || m.weightKg > 400) {
    errors.push('weightKg must be between 20 and 400');
  }

  if (m.heightCm === undefined || m.heightCm === null) {
    errors.push('heightCm is required');
  } else if (m.heightCm < 50 || m.heightCm > 260) {
    errors.push('heightCm must be between 50 and 260');
  }

  if (m.bodyFatPct !== undefined) {
    if (m.bodyFatPct < 0 || m.bodyFatPct > 100) {
      errors.push('bodyFatPct must be between 0 and 100');
    }
    if (!m.bodyFatMethod) {
      errors.push('bodyFatMethod is required when bodyFatPct is provided');
    }
  }

  return { valid: errors.length === 0, errors };
};

/**
 * BMI Calculator (L3 pure function)
 * FR-BODY-03: BMI tidak disimpan, dihitung saat ditampilkan
 */
export const calculateBMI = (weightKg: number, heightCm: number): number => {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
};
