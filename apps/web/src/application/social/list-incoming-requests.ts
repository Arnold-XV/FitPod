/**
 * List incoming friend requests use case
 */

import type { SocialRepository } from '@/domain/social/ports';
import type { Result } from '@/domain/shared/result';
import type { Logger } from '@/domain/shared/logger';
import type { FriendRequest } from '@/domain/social/entities';
import { failure } from '@/domain/shared/result';

interface ListIncomingRequestsDeps {
  socialRepository: SocialRepository;
  logger: Logger;
}

export const createListIncomingRequestsUseCase = (deps: ListIncomingRequestsDeps) => {
  return async (): Promise<Result<FriendRequest[]>> => {
    deps.logger.info('Listing incoming friend requests');

    const result = await deps.socialRepository.listIncomingRequests();
    if (!result.ok) return failure(result.error);

    deps.logger.info('Incoming requests listed', { count: result.value.length });
    return result;
  };
};
