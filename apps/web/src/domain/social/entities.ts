/**
 * Social domain entities
 * Based on PRD: Connections, friend requests, and shared activities
 */

export type ConnectionStatus = 'pending' | 'accepted' | 'blocked';

export interface Connection {
  id: string; // WebID of peer
  peerWebId: string;
  status: ConnectionStatus;
  direction: 'outgoing' | 'incoming'; // who initiated
  since: string; // ISO date
  schemaVersion: number;
}

export interface SharedActivity {
  id: string;
  authorWebId: string;
  date: string; // ISO date
  title: string;
  durationMin: number;
  totalVolumeKg: number;
  exerciseNames: string[];
  visibility: 'friends' | 'public';
  schemaVersion: number;
}

export interface FriendRequest {
  id: string;
  fromWebId: string;
  toWebId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string; // ISO date
  schemaVersion: number;
}

export const validateConnection = (c: Connection): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!c.peerWebId) errors.push('peerWebId is required');
  if (!c.status) errors.push('status is required');
  if (!c.direction) errors.push('direction is required');
  if (!c.since) errors.push('since is required');
  return { valid: errors.length === 0, errors };
};

export const validateFriendRequest = (r: FriendRequest): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!r.fromWebId) errors.push('fromWebId is required');
  if (!r.toWebId) errors.push('toWebId is required');
  if (!r.status) errors.push('status is required');
  if (!r.createdAt) errors.push('createdAt is required');
  return { valid: errors.length === 0, errors };
};

export const validateSharedActivity = (a: SharedActivity): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!a.authorWebId) errors.push('authorWebId is required');
  if (!a.date) errors.push('date is required');
  if (!a.title) errors.push('title is required');
  if (a.durationMin < 0) errors.push('durationMin must be >= 0');
  if (a.totalVolumeKg < 0) errors.push('totalVolumeKg must be >= 0');
  return { valid: errors.length === 0, errors };
};
