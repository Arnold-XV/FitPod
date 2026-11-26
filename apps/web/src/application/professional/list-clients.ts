import type { ProfessionalService } from '@/domain/professional/ports';
import type { ClientAccess } from '@/domain/professional/entities';
import type { Logger } from '@/domain/shared/logger';
import type { Result } from '@/domain/shared/result';

export interface ListClientsDeps {
  professionalService: ProfessionalService;
  logger: Logger;
}

export const createListClientsUseCase = (deps: ListClientsDeps) => {
  return async (): Promise<Result<ClientAccess[]>> => {
    deps.logger.info('Listing clients for professional');

    const result = await deps.professionalService.listClients();

    if (result.ok) {
      deps.logger.info('Clients retrieved', { count: result.value.length });
      return result;
    } else {
      deps.logger.error('Failed to list clients', undefined, { error: result.error });
      return result;
    }
  };
};
