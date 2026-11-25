// Re-export from access domain for convenience
import type { AccessScope, AccessPermission } from '../access/entities';
export type { AccessScope, AccessPermission };

export interface ClientAccess {
  clientWebId: string; // WebID of user who granted access
  clientName?: string; // Extracted from profile
  scope: AccessScope[];
  permissions: AccessPermission;
  grantId: string;
  expiresAt?: string;
  grantedAt: string;
}

export interface ClientSummary {
  webId: string;
  name?: string;
  latestBodyData?: {
    date: string;
    weightKg: number;
    heightCm: number;
    bmi: number;
  };
  latestWorkoutDate?: string;
  accessScope: AccessScope[];
}
