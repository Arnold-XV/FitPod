import type { AccessRepository } from '@/domain/access/ports';
import type { Logger } from '@/domain/shared/logger';
import type { Result } from '@/domain/shared/result';

export interface RevokeAccessDeps {
  accessRepository: AccessRepository;
  logger: Logger;
}

export const createRevokeAccessUseCase = (deps: RevokeAccessDeps) => {
  return async (grantId: string): Promise<Result<void>> => {
    deps.logger.info('Revoking access', { grantId });

    const result = await deps.accessRepository.revokeGrant(grantId);

    if (result.ok) {
      deps.logger.info('Access revoked', { grantId });
      return result;
    } else {
      deps.logger.error('Failed to revoke access', undefined, { error: result.error });
      return result;
    }
  };
};
