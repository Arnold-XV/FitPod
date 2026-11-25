import { describe, it, expect } from 'vitest';
import { validateSharedActivity, validateConnection } from '@/domain/social/entities';

describe('Social Domain', () => {
  it('should validate shared activity', () => {
    const activity = {
      id: '1',
      authorWebId: 'https://test.pod/profile#me',
      date: '2026-11-25',
      title: 'Workout completed',
      durationMin: 30,
      totalVolumeKg: 1000,
      exerciseNames: ['Squat'],
      visibility: 'friends' as const,
      schemaVersion: 1,
    };
    const result = validateSharedActivity(activity);
    expect(result.valid).toBe(true);
  });

  it('should validate connection', () => {
    const connection = {
      id: 'conn-1',
      peerWebId: 'https://friend.pod/profile#me',
      status: 'accepted' as const,
      direction: 'outgoing' as const,
      since: '2026-11-25',
      schemaVersion: 1,
    };
    const result = validateConnection(connection);
    expect(result.valid).toBe(true);
  });
});
