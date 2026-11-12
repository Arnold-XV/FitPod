import { describe, it, expect } from 'vitest';
import { parseScreeningRecord, parseMedicalClearance, parseInjury } from '../domain/health/entities';

describe('Health Domain', () => {
  it('should parse screening record', () => {
    const date = new Date('2026-11-12');
    const record = parseScreeningRecord({}, date);
    expect(record.date).toEqual(date);
    expect(record.result).toBe('clear');
  });

  it('should parse medical clearance', () => {
    const clearance = parseMedicalClearance({}, new Date());
    expect(clearance.issuerRole).toBe('doctor');
    expect(clearance.status).toBe('active');
  });

  it('should parse injury', () => {
    const injury = parseInjury({}, new Date());
    expect(injury.bodyPart).toBe('');
    expect(injury.status).toBe('active');
  });
});