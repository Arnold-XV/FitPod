import type { ProfessionalService } from '@/domain/professional/ports';
import type { ClientSummary } from '@/domain/professional/entities';
import type { Logger } from '@/domain/shared/logger';
import type { Result } from '@/domain/shared/result';

export interface GetClientSummaryDeps {
  professionalService: ProfessionalService;
  logger: Logger;
}

export const createGetClientSummaryUseCase = (deps: GetClientSummaryDeps) => {
  return async (clientWebId: string): Promise<Result<ClientSummary>> => {
    deps.logger.info('Getting client summary', { clientWebId });

    const result = await deps.professionalService.getClientSummary(clientWebId);

    if (result.ok) {
      deps.logger.info('Client summary retrieved', { clientWebId });
      return result;
    } else {
      deps.logger.error('Failed to get client summary', undefined, { error: result.error });
      return result;
    }
  };
};
