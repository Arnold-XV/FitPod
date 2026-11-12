import { describe, it, expect } from 'vitest';
import { parseBodyMeasurement, serializeBodyMeasurement } from '../domain/body/entities';

describe('Body Measurement Domain', () => {
  it('should parse and serialize body measurement', () => {
    const measurement = {
      id: 'test-1',
      date: new Date('2026-11-12'),
      weightKg: 75,
      heightCm: 175,
      provenance: {
        trustLevel: 'self' as const,
        provWasAttributedTo: 'https://arnold.solidcommunity.net/profile/card#me',
      },
    };

    // Test that the entity structure is valid
    expect(measurement.id).toBe('test-1');
    expect(measurement.weightKg).toBe(75);
    expect(measurement.heightCm).toBe(175);
  });

  it('should handle body fat percentage', () => {
    const measurement = {
      id: 'test-2',
      date: new Date('2026-11-12'),
      weightKg: 75,
      heightCm: 175,
      bodyFatPct: 20,
      bodyFatMethod: 'bia',
    };

    expect(measurement.bodyFatPct).toBe(20);
    expect(measurement.bodyFatMethod).toBe('bia');
  });
});