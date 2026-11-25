export interface AccessGrant {
  id: string;
  grantedTo: string; // Professional WebID
  grantedBy: string; // User WebID
  scope: AccessScope[];
  permissions: AccessPermission;
  expiresAt?: string; // ISO date
  createdAt: string; // ISO date
  revokedAt?: string; // ISO date
  schemaVersion: number;
}

export type AccessScope = 'body' | 'workout' | 'nutrition' | 'health';

export type AccessPermission = 'read' | 'readwrite';

export interface AccessRequest {
  id: string;
  requestedBy: string; // Professional WebID
  requestedFrom: string; // User WebID
  scope: AccessScope[];
  permissions: AccessPermission;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  respondedAt?: string;
  schemaVersion: number;
}

export const validateAccessGrant = (
  grant: Partial<AccessGrant>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!grant.grantedTo) errors.push('grantedTo required');
  if (!grant.grantedBy) errors.push('grantedBy required');
  if (!grant.scope || grant.scope.length === 0) errors.push('scope required');
  if (!grant.permissions) errors.push('permissions required');
  if (!grant.createdAt) errors.push('createdAt required');
  
  // Validate WebID format
  if (grant.grantedTo && !grant.grantedTo.startsWith('https://')) {
    errors.push('grantedTo must be valid HTTPS WebID');
  }
  
  // Validate expiry in future
  if (grant.expiresAt && new Date(grant.expiresAt) <= new Date()) {
    errors.push('expiresAt must be future date');
  }
  
  return { valid: errors.length === 0, errors };
};
