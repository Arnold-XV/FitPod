/**
 * Send friend request use case
 */

import type { SocialRepository } from '@/domain/social/ports';
import type { Result } from '@/domain/shared/result';
import type { Logger } from '@/domain/shared/logger';
import { appError, failure, success } from '@/domain/shared/result';
import type { Clock } from '@/domain/shared/clock';

interface SendFriendRequestInput {
  toWebId: string;
}

interface SendFriendRequestDeps {
  socialRepository: SocialRepository;
  logger: Logger;
  clock: Clock;
  currentWebId: string;
}

export const createSendFriendRequestUseCase = (deps: SendFriendRequestDeps) => {
  return async (input: SendFriendRequestInput): Promise<Result<void>> => {
    deps.logger.info('Sending friend request', { toWebId: input.toWebId });

    // Validate WebID format
    try {
      new URL(input.toWebId);
    } catch {
      return failure(appError('ValidationFailed', 'Invalid WebID format'));
    }

    if (input.toWebId === deps.currentWebId) {
      return failure(appError('ValidationFailed', 'Cannot send friend request to yourself'));
    }

    // Check if connection already exists
    const existingResult = await deps.socialRepository.getConnection(input.toWebId);
    if (!existingResult.ok) return failure(existingResult.error);

    if (existingResult.value) {
      return failure(appError('Conflict', 'Connection already exists'));
    }

    // Send notification to recipient's inbox
    const sendResult = await deps.socialRepository.sendFriendRequest(input.toWebId, deps.currentWebId);
    if (!sendResult.ok) return failure(sendResult.error);

    // Add pending outgoing connection to own connections.ttl
    const addResult = await deps.socialRepository.addConnection({
      id: input.toWebId,
      peerWebId: input.toWebId,
      status: 'pending',
      direction: 'outgoing',
      since: deps.clock.now().toISOString().split('T')[0]!,
      schemaVersion: 1,
    });

    if (!addResult.ok) return failure(addResult.error);

    deps.logger.info('Friend request sent successfully', { toWebId: input.toWebId });
    return success(undefined);
  };
};
