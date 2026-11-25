/**
 * Get social feed use case - aggregates shared activities from friends
 */

import type { SocialRepository } from '@/domain/social/ports';
import type { Result } from '@/domain/shared/result';
import type { Logger } from '@/domain/shared/logger';
import type { SharedActivity } from '@/domain/social/entities';
import { failure, success } from '@/domain/shared/result';

interface GetSocialFeedDeps {
  socialRepository: SocialRepository;
  logger: Logger;
}

export const createGetSocialFeedUseCase = (deps: GetSocialFeedDeps) => {
  return async (): Promise<Result<SharedActivity[]>> => {
    console.log('[GetSocialFeed] Starting feed fetch');
    deps.logger.info('Fetching social feed');

    // Get list of accepted connections
    const connectionsResult = await deps.socialRepository.listConnections();
    if (!connectionsResult.ok) {
      console.log('[GetSocialFeed] Failed to list connections:', connectionsResult.error);
      return failure(connectionsResult.error);
    }

    const friends = connectionsResult.value.filter(c => c.status === 'accepted');
    console.log('[GetSocialFeed] Friends found:', friends.length, friends.map(f => f.peerWebId));
    deps.logger.info('Found friends', { count: friends.length });

    // Fetch shared activities from each friend in parallel
    const feedPromises = friends.map(async (friend) => {
      console.log('[GetSocialFeed] Fetching activities from:', friend.peerWebId);
      const result = await deps.socialRepository.listSharedActivities(friend.peerWebId);
      if (!result.ok) {
        console.log('[GetSocialFeed] Failed for friend:', friend.peerWebId, result.error);
        deps.logger.warn('Failed to fetch activities from friend', { 
          friendWebId: friend.peerWebId, 
          error: result.error 
        });
        return [];
      }
      console.log('[GetSocialFeed] Activities from', friend.peerWebId, ':', result.value.length);
      return result.value;
    });

    const results = await Promise.all(feedPromises);
    
    // Concat and sort by date descending
    const allActivities = results.flat();
    allActivities.sort((a, b) => b.date.localeCompare(a.date));

    console.log('[GetSocialFeed] Total activities:', allActivities.length);
    deps.logger.info('Social feed fetched', { totalActivities: allActivities.length });
    return success(allActivities);
  };
};
