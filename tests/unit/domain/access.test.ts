import { describe, it, expect } from 'vitest';
import { parseAccessGrant } from '../domain/access/entities';

describe('Access Domain', () => {
  it('should parse access grant', () => {
    const grant = parseAccessGrant({}, new Date());
    expect(grant.granteeWebId).toBe('');
    expect(grant.role).toBe('trainer');
    expect(grant.status).toBe('active');
  });
});