/**
 * Setup inbox use case
 * Configures inbox with public append permission on first login
 */

import type { AclManager } from '@/data/acl/acl-manager';
import type { Result } from '@/domain/shared/result';
import type { Logger } from '@/domain/shared/logger';
import { success } from '@/domain/shared/result';

interface SetupInboxDeps {
  aclManager: AclManager;
  logger: Logger;
}

export const createSetupInboxUseCase = (deps: SetupInboxDeps) => {
  return async (): Promise<Result<void>> => {
    deps.logger.info('Setting up inbox with public append access');

    const result = await deps.aclManager.setupInboxAccess();
    
    if (result.ok) {
      deps.logger.info('Inbox setup completed successfully');
    } else {
      deps.logger.warn('Inbox setup failed, friend requests may not work', { error: result.error });
    }

    // Don't fail login if inbox setup fails
    return success(undefined);
  };
};
