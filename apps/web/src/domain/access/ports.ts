import type { Result } from '../shared/result';
import type { AccessGrant, AccessRequest } from './entities';

export interface AccessRepository {
  listGrants(): Promise<Result<AccessGrant[]>>;
  getGrant(id: string): Promise<Result<AccessGrant | null>>;
  createGrant(grant: AccessGrant): Promise<Result<void>>;
  revokeGrant(id: string): Promise<Result<void>>;
  setWebId(webId: string): void;
  ensureStorageRoot(): Promise<void>;
}

export interface AccessRequestRepository {
  listRequests(): Promise<Result<AccessRequest[]>>;
  createRequest(request: AccessRequest): Promise<Result<void>>;
  updateRequestStatus(id: string, status: 'approved' | 'rejected'): Promise<Result<void>>;
  setWebId(webId: string): void;
}
