import type { AccessRepository } from '@/domain/access/ports';
import type { AccessGrant, AccessScope, AccessPermission } from '@/domain/access/entities';
import type { Clock } from '@/domain/shared/clock';
import type { IdGenerator } from '@/domain/shared/id-generator';
import type { Logger } from '@/domain/shared/logger';
import type { Result } from '@/domain/shared/result';
import { validateAccessGrant } from '@/domain/access/entities';

export interface GrantAccessDeps {
  accessRepository: AccessRepository;
  clock: Clock;
  idGenerator: IdGenerator;
  logger: Logger;
  currentWebId: string; // User's WebID
}

export interface GrantAccessInput {
  professionalWebId: string;
  scope: AccessScope[];
  permissions: AccessPermission;
  expiresAt?: string;
}

export const createGrantAccessUseCase = (deps: GrantAccessDeps) => {
  return async (input: GrantAccessInput): Promise<Result<string>> => {
    deps.logger.info('Granting access', { 
      to: input.professionalWebId,
      scope: input.scope 
    });

    const id = deps.idGenerator.generate();
    const now = deps.clock.now().toISOString();

    const grant: AccessGrant = {
      id,
      grantedTo: input.professionalWebId,
      grantedBy: deps.currentWebId,
      scope: input.scope,
      permissions: input.permissions,
      expiresAt: input.expiresAt,
      createdAt: now,
      schemaVersion: 1,
    };

    const validation = validateAccessGrant(grant);
    if (!validation.valid) {
      deps.logger.error('Invalid grant', undefined, { errors: validation.errors });
      return { 
        ok: false, 
        error: { 
          type: 'ValidationFailed', 
          message: validation.errors.join(', ') 
        } 
      };
    }

    const result = await deps.accessRepository.createGrant(grant);

    if (result.ok) {
      deps.logger.info('Access granted', { id, to: input.professionalWebId });
      return { ok: true, value: id };
    } else {
      deps.logger.error('Failed to grant access', undefined, { error: result.error });
      return result;
    }
  };
};
