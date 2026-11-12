import { describe, it, expect } from 'vitest';
import { parseSharedActivity, parseConnection } from '../domain/social/entities';

describe('Social Domain', () => {
  it('should parse shared activity', () => {
    const activity = parseSharedActivity({}, new Date());
    expect(activity.title).toBe('');
    expect(activity.visibility).toBe('friends');
  });

  it('should parse connection', () => {
    const connection = parseConnection({}, new Date());
    expect(connection.status).toBe('pending');
    expect(connection.direction).toBe('outgoing');
  });
});