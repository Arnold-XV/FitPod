import type { Result } from '../shared/result';
import type { 
  ClientAccess, 
  ClientSummary, 
  ClientDetail,
  RoutineRecommendation 
} from './entities';

export interface ProfessionalService {
  listClients(): Promise<Result<ClientAccess[]>>;
  getClientSummary(clientWebId: string): Promise<Result<ClientSummary>>;
  getClientDetail(clientWebId: string): Promise<Result<ClientDetail>>;
  setWebId(webId: string): void;
}

export interface RecommendationRepository {
  /**
   * Create recommendation in professional's Pod.
   */
  createRecommendation(rec: RoutineRecommendation): Promise<Result<void>>;
  
  /**
   * List recommendations created by current professional.
   */
  listRecommendations(): Promise<Result<RoutineRecommendation[]>>;
  
  /**
   * Get specific recommendation.
   */
  getRecommendation(id: string): Promise<Result<RoutineRecommendation | null>>;
  
  /**
   * Send recommendation to client's Pod (creates notification).
   */
  sendToClient(recId: string, clientWebId: string): Promise<Result<void>>;
  
  setWebId(webId: string): void;
  ensureStorageRoot(): Promise<void>;
}

export interface ClientRecommendationService {
  /**
   * List recommendations received from professionals.
   */
  listReceivedRecommendations(): Promise<Result<RoutineRecommendation[]>>;
  
  /**
   * Get specific recommendation.
   */
  getRecommendation(recId: string, professionalWebId: string): Promise<Result<RoutineRecommendation | null>>;
  
  /**
   * Apply recommendation days to client routines (with overwrite detection).
   */
  applyRecommendation(
    recId: string, 
    professionalWebId: string,
    daysToApply: number[] // Array of dayOfWeek to apply
  ): Promise<Result<{ overwritten: number[] }>>;
  
  /**
   * Reject recommendation.
   */
  rejectRecommendation(recId: string, professionalWebId: string): Promise<Result<void>>;
  
  setWebId(webId: string): void;
}
