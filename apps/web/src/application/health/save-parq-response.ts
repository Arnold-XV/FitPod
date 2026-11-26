import type { ParQRepository } from '@/domain/health/ports';
import type { ParQResponse } from '@/domain/health/entities';
import type { Result } from '@/domain/shared/result';
import type { Logger } from '@/domain/shared/logger';
import type { Clock } from '@/domain/shared/clock';
import type { IdGenerator } from '@/domain/shared/id-generator';
import { validateParQResponse } from '@/domain/health/entities';
import { failure, appError } from '@/domain/shared/result';

export interface SaveParQResponseDeps {
  parqRepository: ParQRepository;
  clock: Clock;
  idGenerator: IdGenerator;
  logger: Logger;
}

export interface SaveParQResponseInput {
  responses: {
    q1: boolean;
    q2: boolean;
    q3: boolean;
    q4: boolean;
    q5: boolean;
    q6: boolean;
    q7: boolean;
  };
  followUpCompleted: boolean;
}

export const createSaveParQResponseUseCase = (deps: SaveParQResponseDeps) => {
  return async (input: SaveParQResponseInput): Promise<Result<string>> => {
    deps.logger.info('Saving PAR-Q+ response', { hasFollowUp: input.followUpCompleted });
    
    const response: ParQResponse = {
      id: deps.idGenerator.generate(),
      date: deps.clock.nowIso().split('T')[0] ?? '',
      responses: input.responses,
      followUpCompleted: input.followUpCompleted,
      schemaVersion: 1,
    };
    
    const validation = validateParQResponse(response);
    if (!validation.valid) {
      return failure(
        appError('ValidationFailed', 'Invalid PAR-Q+ response', validation.errors.join(', '))
      );
    }
    
    const result = await deps.parqRepository.saveResponse(response);
    
    if (result.ok) {
      deps.logger.info('PAR-Q+ response saved', { id: response.id });
      return { ok: true, value: response.id };
    }
    
    deps.logger.error('Failed to save PAR-Q+ response', undefined, { error: result.error });
    return result;
  };
};
