/**
 * Logout use case (L2 Application)
 */

import type { AuthSession } from '@/infrastructure/auth/auth-session';
import type { Logger } from '@/domain/shared/logger';

export interface LogoutDeps {
  authSession: AuthSession;
  logger: Logger;
}

export const createLogoutUseCase = (deps: LogoutDeps) => {
  return async (): Promise<void> => {
    deps.logger.info('Logout initiated');

    try {
      await deps.authSession.logout();
      deps.logger.info('Logout successful');
    } catch (error) {
      deps.logger.error('Logout failed', error instanceof Error ? error : undefined);
      throw error;
    }
  };
};
