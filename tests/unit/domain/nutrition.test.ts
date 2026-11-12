import { describe, it, expect } from 'vitest';
import { parseNutritionDay, serializeNutritionDay } from '../domain/nutrition/entities';

describe('Nutrition Domain', () => {
  it('should parse nutrition day', () => {
    const date = new Date('2026-11-12');
    const nutrition = parseNutritionDay({}, date);
    expect(nutrition.date).toEqual(date);
    expect(nutrition.entries).toEqual([]);
  });

  it('should handle nutrition entry', () => {
    const date = new Date('2026-11-12');
    const nutrition = parseNutritionDay({}, date);
    nutrition.entries.push({
      datetime: new Date(),
      meal: 'lunch' as const,
      foodName: 'Apple',
      source: 'custom' as const,
      quantityG: 150,
      kcal: 80,
      proteinG: 0.5,
      carbG: 20,
      fatG: 0.3,
    });
    expect(nutrition.entries.length).toBe(1);
    expect(nutrition.entries[0].foodName).toBe('Apple');
  });
});