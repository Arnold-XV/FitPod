import type { Result } from '../shared/result';
import type { ParQResponse } from './entities';

export interface ParQRepository {
  /**
   * Save PAR-Q+ response.
   */
  saveResponse(response: ParQResponse): Promise<Result<void>>;
  
  /**
   * Get latest PAR-Q+ response.
   */
  getLatestResponse(): Promise<Result<ParQResponse | null>>;
  
  /**
   * List all PAR-Q+ responses.
   */
  listResponses(): Promise<Result<ParQResponse[]>>;
  
  setWebId(webId: string): void;
  ensureStorageRoot(): Promise<void>;
}
