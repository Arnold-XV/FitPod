import type { ClientRecommendationService } from '@/domain/professional/ports';
import type { Result } from '@/domain/shared/result';
import type { Logger } from '@/domain/shared/logger';

export interface ApplyRecommendationDeps {
  clientRecommendationService: ClientRecommendationService;
  logger: Logger;
}

export interface ApplyRecommendationInput {
  recommendationId: string;
  professionalWebId: string;
  daysToApply: number[]; // Array of dayOfWeek (0-6)
}

export const createApplyRecommendationUseCase = (deps: ApplyRecommendationDeps) => {
  return async (input: ApplyRecommendationInput): Promise<Result<{ overwritten: number[] }>> => {
    deps.logger.info('Applying recommendation', { 
      recId: input.recommendationId,
      days: input.daysToApply 
    });
    
    const result = await deps.clientRecommendationService.applyRecommendation(
      input.recommendationId,
      input.professionalWebId,
      input.daysToApply
    );
    
    if (result.ok) {
      deps.logger.info('Recommendation applied', { 
        overwritten: result.value.overwritten 
      });
    } else {
      deps.logger.error('Failed to apply recommendation', undefined, { error: result.error });
    }
    
    return result;
  };
};
