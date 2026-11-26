import type { Result } from '@/domain/shared/result';
import type { Logger } from '@/domain/shared/logger';
import type { ClientRegistry } from '@/data/repositories/professional/client-registry';

export interface RegisterClientDeps {
  clientRegistry: ClientRegistry;
  logger: Logger;
}

export const createRegisterClientUseCase = (deps: RegisterClientDeps) => {
  return async (clientWebId: string): Promise<Result<void>> => {
    deps.logger.info('Registering client', { clientWebId });
    
    // Add to registry
    const result = await deps.clientRegistry.addClient(clientWebId);
    
    if (result.ok) {
      deps.logger.info('Client registered', { clientWebId });
    } else {
      deps.logger.error('Failed to register client', undefined, { error: result.error });
    }
    
    return result;
  };
};
