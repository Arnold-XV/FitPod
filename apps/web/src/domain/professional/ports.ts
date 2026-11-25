import type { Result } from '../shared/result';
import type { ClientAccess, ClientSummary } from './entities';

export interface ProfessionalService {
  listClients(): Promise<Result<ClientAccess[]>>;
  getClientSummary(clientWebId: string): Promise<Result<ClientSummary>>;
  setWebId(webId: string): void;
}
