/**
 * Social repository port (L3)
 */

import type { Result } from '@/domain/shared/result';
import type { Connection, FriendRequest, SharedActivity } from './entities';

export interface SocialRepository {
  /**
   * Storage root discovery - must be called before operations
   */
  setWebId(webId: string): void;
  ensureStorageRoot(): Promise<void>;

  // Connections
  listConnections(): Promise<Result<Connection[]>>;
  getConnection(peerWebId: string): Promise<Result<Connection | null>>;
  addConnection(connection: Connection): Promise<Result<void>>;
  updateConnection(connection: Connection): Promise<Result<void>>;
  removeConnection(peerWebId: string): Promise<Result<void>>;

  // Friend Requests (inbox notifications)
  sendFriendRequest(toWebId: string, fromWebId: string): Promise<Result<void>>;
  sendAcceptanceNotification(toWebId: string, fromWebId: string): Promise<Result<void>>;
  sendRemoveNotification(toWebId: string, fromWebId: string): Promise<Result<void>>;
  listIncomingRequests(): Promise<Result<FriendRequest[]>>;
  listOutgoingRequests(): Promise<Result<FriendRequest[]>>;
  deleteInboxNotification(notificationUrl: string): Promise<Result<void>>;

  // Shared Activities
  listSharedActivities(webId: string): Promise<Result<SharedActivity[]>>;
  addSharedActivity(activity: SharedActivity): Promise<Result<void>>;
}
