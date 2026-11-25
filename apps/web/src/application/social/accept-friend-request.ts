/**
 * Accept friend request use case
 */

import type { SocialRepository } from '@/domain/social/ports';
import type { Result } from '@/domain/shared/result';
import type { Logger } from '@/domain/shared/logger';
import { failure, success } from '@/domain/shared/result';
import type { Clock } from '@/domain/shared/clock';
import type { AclManager } from '@/data/acl/acl-manager';

interface AcceptFriendRequestInput {
  requestId: string;
  fromWebId: string;
}

interface AcceptFriendRequestDeps {
  socialRepository: SocialRepository;
  aclManager: AclManager;
  logger: Logger;
  clock: Clock;
  currentWebId: string;
}

export const createAcceptFriendRequestUseCase = (deps: AcceptFriendRequestDeps) => {
  return async (input: AcceptFriendRequestInput): Promise<Result<void>> => {
    deps.logger.info('Accepting friend request', { fromWebId: input.fromWebId });

    // Add accepted connection to own connections.ttl
    const addResult = await deps.socialRepository.addConnection({
      id: input.fromWebId,
      peerWebId: input.fromWebId,
      status: 'accepted',
      direction: 'incoming',
      since: deps.clock.now().toISOString().split('T')[0]!,
      schemaVersion: 1,
    });

    if (!addResult.ok) return failure(addResult.error);

    // Grant read access to social/shared/ folder for the friend
    deps.logger.info('Granting ACL read access to social/shared/', { friendWebId: input.fromWebId });
    const aclResult = await deps.aclManager.grantSharedFolderAccess(input.fromWebId);
    
    if (!aclResult.ok) {
      deps.logger.warn('Failed to grant ACL access, but connection saved', { 
        friendWebId: input.fromWebId, 
        error: aclResult.error 
      });
      // Don't fail the whole operation - connection is still recorded
    }

    // Send acceptance notification back to sender's inbox
    deps.logger.info('Sending acceptance notification to sender', { toWebId: input.fromWebId });
    const acceptResult = await deps.socialRepository.sendAcceptanceNotification(input.fromWebId, deps.currentWebId);
    if (!acceptResult.ok) {
      deps.logger.warn('Failed to send acceptance notification', { error: acceptResult.error });
      // Don't fail - connection is still saved
    }

    // Delete the notification from inbox
    deps.logger.info('Deleting inbox notification', { requestId: input.requestId });
    const deleteResult = await deps.socialRepository.deleteInboxNotification(input.requestId);
    if (!deleteResult.ok) {
      deps.logger.warn('Failed to delete notification, but request was accepted', {
        error: deleteResult.error
      });
    }

    deps.logger.info('Friend request accepted', { fromWebId: input.fromWebId });
    return success(undefined);
  };
};
