import { describe, it, expect } from 'vitest';
import { parsePrescription } from '../domain/professional/entities';

describe('Professional Domain', () => {
  it('should parse prescription', () => {
    const prescription = parsePrescription({}, new Date());
    expect(prescription.type).toBe('program');
    expect(prescription.status).toBe('active');
  });
});