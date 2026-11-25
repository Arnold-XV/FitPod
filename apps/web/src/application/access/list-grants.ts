import type { AccessRepository } from '@/domain/access/ports';
import type { AccessGrant } from '@/domain/access/entities';
import type { Logger } from '@/domain/shared/logger';
import type { Result } from '@/domain/shared/result';

export interface ListGrantsDeps {
  accessRepository: AccessRepository;
  logger: Logger;
}

export const createListGrantsUseCase = (deps: ListGrantsDeps) => {
  return async (): Promise<Result<AccessGrant[]>> => {
    deps.logger.info('Listing access grants');

    const result = await deps.accessRepository.listGrants();

    if (result.ok) {
      deps.logger.info('Grants retrieved', { count: result.value.length });
      return result;
    } else {
      deps.logger.error('Failed to list grants', undefined, { error: result.error });
      return result;
    }
  };
};
