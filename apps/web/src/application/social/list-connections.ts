/**
 * List connections use case
 */

import type { SocialRepository } from '@/domain/social/ports';
import type { Result } from '@/domain/shared/result';
import type { Logger } from '@/domain/shared/logger';
import type { Connection } from '@/domain/social/entities';
import { failure } from '@/domain/shared/result';

interface ListConnectionsDeps {
  socialRepository: SocialRepository;
  logger: Logger;
}

export const createListConnectionsUseCase = (deps: ListConnectionsDeps) => {
  return async (): Promise<Result<Connection[]>> => {
    deps.logger.info('Listing connections');

    const result = await deps.socialRepository.listConnections();
    if (!result.ok) return failure(result.error);

    deps.logger.info('Connections listed', { count: result.value.length });
    return result;
  };
};
