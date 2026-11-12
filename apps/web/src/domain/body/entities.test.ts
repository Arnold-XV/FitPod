/**
 * Tests for Body domain entities (L3)
 * AR-04: L3 pure functions testing
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBMI,
  validateBodyMeasurement,
  type BodyMeasurement,
} from './entities';

describe('Body Domain - Entities', () => {
  describe('calculateBMI', () => {
    it('should calculate BMI correctly', () => {
      const bmi = calculateBMI(70, 170);
      expect(bmi).toBeCloseTo(24.22, 2);
    });

    it('should handle different weight/height combinations', () => {
      expect(calculateBMI(80, 180)).toBeCloseTo(24.69, 2);
      expect(calculateBMI(60, 160)).toBeCloseTo(23.44, 2);
      expect(calculateBMI(100, 200)).toBeCloseTo(25.0, 2);
    });
  });

  describe('validateBodyMeasurement', () => {
    const validMeasurement: BodyMeasurement = {
      id: '123',
      date: '2026-11-12',
      weightKg: 70,
      heightCm: 170,
      schemaVersion: 1,
    };

    it('should pass validation for valid measurement', () => {
      const result = validateBodyMeasurement(validMeasurement);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when date is missing', () => {
      const invalid = { ...validMeasurement, date: '' };
      const result = validateBodyMeasurement(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('date is required');
    });

    it('should fail when weightKg is out of range', () => {
      const tooLight = { ...validMeasurement, weightKg: 15 };
      const resultLight = validateBodyMeasurement(tooLight);
      expect(resultLight.valid).toBe(false);
      expect(resultLight.errors).toContain('weightKg must be between 20 and 400');

      const tooHeavy = { ...validMeasurement, weightKg: 500 };
      const resultHeavy = validateBodyMeasurement(tooHeavy);
      expect(resultHeavy.valid).toBe(false);
    });

    it('should fail when heightCm is out of range', () => {
      const tooShort = { ...validMeasurement, heightCm: 30 };
      const resultShort = validateBodyMeasurement(tooShort);
      expect(resultShort.valid).toBe(false);
      expect(resultShort.errors).toContain('heightCm must be between 50 and 260');
    });

    it('should require bodyFatMethod when bodyFatPct is provided', () => {
      const withBodyFat = { ...validMeasurement, bodyFatPct: 15 };
      const result = validateBodyMeasurement(withBodyFat);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'bodyFatMethod is required when bodyFatPct is provided'
      );
    });

    it('should pass validation with valid bodyFatPct and method', () => {
      const withBodyFat = {
        ...validMeasurement,
        bodyFatPct: 15,
        bodyFatMethod: 'bia' as const,
      };
      const result = validateBodyMeasurement(withBodyFat);
      expect(result.valid).toBe(true);
    });
  });
});
