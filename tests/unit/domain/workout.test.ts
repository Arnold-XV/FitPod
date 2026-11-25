import { describe, it, expect } from 'vitest';
import type { WorkoutSession } from '@/domain/workout/entities';

describe('Workout Domain', () => {
  it('should create workout session', () => {
    const session: WorkoutSession = {
      id: 'session-1',
      date: '2026-11-25',
      startTime: '2026-11-25T10:00:00Z',
      endTime: '2026-11-25T11:00:00Z',
      exerciseBlocks: [],
      schemaVersion: 1,
    };
    expect(session.date).toBe('2026-11-25');
    expect(session.exerciseBlocks).toEqual([]);
  });

  it('should handle exercise blocks', () => {
    const session: WorkoutSession = {
      id: 'session-2',
      date: '2026-11-25',
      startTime: '2026-11-25T10:00:00Z',
      endTime: '2026-11-25T11:00:00Z',
      exerciseBlocks: [
        {
          position: 1,
          exerciseName: 'Bench Press',
          exerciseRef: { source: 'custom', id: 'bench-press' },
          sets: [
            { setIndex: 1, weightKg: 60, reps: 8 },
            { setIndex: 2, weightKg: 60, reps: 7 },
          ],
        },
      ],
      schemaVersion: 1,
    };
    expect(session.exerciseBlocks.length).toBe(1);
    expect(session.exerciseBlocks[0].exerciseName).toBe('Bench Press');
  });
});
