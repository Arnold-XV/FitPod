/**
 * Reject friend request use case
 */

import type { SocialRepository } from '@/domain/social/ports';
import type { Result } from '@/domain/shared/result';
import type { Logger } from '@/domain/shared/logger';
import { success } from '@/domain/shared/result';

interface RejectFriendRequestInput {
  requestId: string;
  fromWebId: string;
}

interface RejectFriendRequestDeps {
  socialRepository: SocialRepository;
  logger: Logger;
}

export const createRejectFriendRequestUseCase = (deps: RejectFriendRequestDeps) => {
  return async (input: RejectFriendRequestInput): Promise<Result<void>> => {
    deps.logger.info('Rejecting friend request', { fromWebId: input.fromWebId });

    // Delete the notification from inbox
    deps.logger.info('Deleting inbox notification', { requestId: input.requestId });
    const deleteResult = await deps.socialRepository.deleteInboxNotification(input.requestId);
    if (!deleteResult.ok) {
      deps.logger.warn('Failed to delete notification', { error: deleteResult.error });
      return failure(deleteResult.error);
    }

    // TODO: Send rejection notification back to sender's inbox

    deps.logger.info('Friend request rejected', { fromWebId: input.fromWebId });
    return success(undefined);
  };
};
