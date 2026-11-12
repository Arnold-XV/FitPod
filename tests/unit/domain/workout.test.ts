import { describe, it, expect } from 'vitest';
import { parseWorkoutSession, serializeWorkoutSession } from '../domain/workout/entities';

describe('Workout Domain', () => {
  it('should parse workout session', () => {
    const session = parseWorkoutSession({}, new Date());
    expect(session.date).toBeInstanceOf(Date);
    expect(session.exerciseBlocks).toEqual([]);
  });

  it('should handle exercise blocks', () => {
    const session = parseWorkoutSession({}, new Date());
    session.exerciseBlocks.push({
      position: 1,
      exerciseName: 'Bench Press',
      sets: [
        { setIndex: 1, weightKg: 60, reps: 8 },
        { setIndex: 2, weightKg: 60, reps: 7 },
      ],
    });
    expect(session.exerciseBlocks.length).toBe(1);
    expect(session.exerciseBlocks[0].exerciseName).toBe('Bench Press');
  });
});