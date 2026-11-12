/**
 * Login use case (L2 Application)
 * SAD 7.1: Use case per module
 */

import type { AuthSession } from '@/infrastructure/auth/auth-session';
import type { Logger } from '@/domain/shared/logger';

export interface LoginDeps {
  authSession: AuthSession;
  logger: Logger;
}

export const createLoginUseCase = (deps: LoginDeps) => {
  return async (oidcIssuer: string): Promise<void> => {
    deps.logger.info('Login initiated', { oidcIssuer });

    try {
      await deps.authSession.login(oidcIssuer);
      deps.logger.info('Login successful');
    } catch (error) {
      deps.logger.error('Login failed', error instanceof Error ? error : undefined);
      throw error;
    }
  };
};
