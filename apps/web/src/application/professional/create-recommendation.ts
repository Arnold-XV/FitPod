import type { RecommendationRepository } from '@/domain/professional/ports';
import type { RoutineRecommendation, DayRoutine } from '@/domain/professional/entities';
import type { Result } from '@/domain/shared/result';
import type { Logger } from '@/domain/shared/logger';
import type { Clock } from '@/domain/shared/clock';
import type { IdGenerator } from '@/domain/shared/id-generator';
import { validateRoutineRecommendation } from '@/domain/professional/entities';
import { failure, appError } from '@/domain/shared/result';

export interface CreateRecommendationDeps {
  recommendationRepository: RecommendationRepository;
  clock: Clock;
  idGenerator: IdGenerator;
  logger: Logger;
  currentWebId: string; // Professional WebID
}

export interface CreateRecommendationInput {
  clientWebId: string;
  days: DayRoutine[];
  notes?: string;
}

export const createCreateRecommendationUseCase = (deps: CreateRecommendationDeps) => {
  return async (input: CreateRecommendationInput): Promise<Result<string>> => {
    deps.logger.info('Creating routine recommendation', { 
      clientWebId: input.clientWebId,
      dayCount: input.days.length 
    });
    
    const recommendation: RoutineRecommendation = {
      id: deps.idGenerator.generate(),
      clientWebId: input.clientWebId,
      professionalWebId: deps.currentWebId,
      createdAt: deps.clock.nowIso(),
      status: 'pending',
      days: input.days,
      notes: input.notes,
      schemaVersion: 1,
    };
    
    const validation = validateRoutineRecommendation(recommendation);
    if (!validation.valid) {
      return failure(
        appError('ValidationFailed', 'Invalid recommendation', validation.errors.join(', '))
      );
    }
    
    // 1. Save to professional's Pod
    const saveResult = await deps.recommendationRepository.createRecommendation(recommendation);
    if (!saveResult.ok) return saveResult;
    
    // 2. Send to client's Pod
    const sendResult = await deps.recommendationRepository.sendToClient(
      recommendation.id,
      input.clientWebId
    );
    
    if (sendResult.ok) {
      deps.logger.info('Recommendation created and sent', { id: recommendation.id });
      return { ok: true, value: recommendation.id };
    }
    
    deps.logger.error('Failed to send recommendation to client', undefined, { error: sendResult.error });
    return sendResult;
  };
};
