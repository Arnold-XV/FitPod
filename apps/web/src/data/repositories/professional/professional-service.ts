import { DataFactory, Store } from 'n3';
import type { ProfessionalService } from '@/domain/professional/ports';
import type { ClientAccess, ClientSummary } from '@/domain/professional/entities';
import type { Result } from '@/domain/shared/result';
import { success } from '@/domain/shared/result';
import type { SolidIo } from '@/data/solid/solid-io';
import {
  FP,
  FP_GRANTED_TO,
  FP_SCOPE,
  FP_PERMISSIONS,
  FP_EXPIRES_AT,
  FP_CREATED_AT,
  FOAF,
  VCARD,
} from '@fitpod/vocab';
import { createClientRegistry, type ClientRegistry } from './client-registry';

const { namedNode } = DataFactory;

export interface CreateProfessionalServiceOptions {
  solidIo: SolidIo;
}

export const createProfessionalService = (
  options: CreateProfessionalServiceOptions
): ProfessionalService => {
  let webId = '';
  let clientRegistry: ClientRegistry | undefined;

  /**
   * Extract profile name from WebID document.
   * Looks for foaf:name or vcard:fn.
   */
  const extractProfileName = async (clientWebId: string): Promise<string | undefined> => {
    try {
      const result = await options.solidIo.readTurtle(clientWebId);
      if (!result.ok) return undefined;
      
      const { store } = result.value;
      const webIdNode = namedNode(clientWebId);
      
      // Try foaf:name
      const foafNameQuads = store.getQuads(
        webIdNode as any,
        namedNode(`${FOAF}name`) as any,
        null,
        null
      );
      if (foafNameQuads.length > 0) {
        return foafNameQuads[0].object.value;
      }
      
      // Try vcard:fn
      const vcardFnQuads = store.getQuads(
        webIdNode as any,
        namedNode(`${VCARD}fn`) as any,
        null,
        null
      );
      if (vcardFnQuads.length > 0) {
        return vcardFnQuads[0].object.value;
      }
      
      return undefined;
    } catch (error) {
      console.error(`Failed to extract profile name for ${clientWebId}:`, error);
      return undefined;
    }
  };

  const ensureRegistry = (): ClientRegistry => {
    if (!clientRegistry && webId) {
      const url = new URL(webId);
      const storageRoot = `${url.protocol}//${url.host}/`;
      clientRegistry = createClientRegistry(options.solidIo, storageRoot);
    }
    return clientRegistry!;
  };

  /**
   * Helper to parse grant from store
   */
  const parseGrantFromStore = (store: Store, url: string) => {
    const subject = `${url}#it`;
    const subjectNode = namedNode(subject);
    
    const getValue = (predicate: string): string | undefined => {
      const quads = store.getQuads(subjectNode as any, namedNode(predicate) as any, null, null);
      return quads.length > 0 ? quads[0].object.value : undefined;
    };
    
    const getValues = (predicate: string): string[] => {
      const quads = store.getQuads(subjectNode as any, namedNode(predicate) as any, null, null);
      return quads.map(q => q.object.value);
    };
    
    const id = url.split('/').pop()?.replace('.ttl', '') ?? '';
    
    return {
      id,
      scope: getValues(FP_SCOPE),
      permissions: getValue(FP_PERMISSIONS),
      expiresAt: getValue(FP_EXPIRES_AT),
      createdAt: getValue(FP_CREATED_AT) ?? '',
    };
  };

  /**
   * Discover grants made BY clients TO current professional.
   * 
   * Uses client registry to find known clients, then queries their pods
   * for access grants where grantedTo matches current professional.
   */
  const discoverGrantsForProfessional = async (): Promise<ClientAccess[]> => {
    const registry = ensureRegistry();
    const clientsResult = await registry.listClients();
    
    if (!clientsResult.ok) return [];
    
    const clients: ClientAccess[] = [];
    
    for (const entry of clientsResult.value) {
      // For each registered client, query their grants
      const clientUrl = new URL(entry.clientWebId);
      const clientStorage = `${clientUrl.protocol}//${clientUrl.host}/`;
      const grantsUrl = `${clientStorage}fitpod/access/grants/`;
      
      // List grants in client's Pod
      const listResult = await options.solidIo.listContainer(grantsUrl);
      if (!listResult.ok) continue;
      
      // Read each grant and check if it's for current professional
      for (const grantUrl of listResult.value) {
        if (!grantUrl.endsWith('.ttl')) continue;
        
        const readResult = await options.solidIo.readTurtle(grantUrl);
        if (!readResult.ok) continue;
        
        const { store } = readResult.value;
        const grantSubject = `${grantUrl}#it`;
        
        // Check grantedTo matches current webId
        const grantedToQuads = store.getQuads(
          namedNode(grantSubject) as any,
          namedNode(FP_GRANTED_TO) as any,
          null,
          null
        );
        
        if (grantedToQuads.length > 0 && grantedToQuads[0].object.value === webId) {
          // Parse grant details
          const grant = parseGrantFromStore(store, grantUrl);
          
          const name = await extractProfileName(entry.clientWebId);
          
          clients.push({
            clientWebId: entry.clientWebId,
            clientName: name,
            scope: grant.scope as any[],
            permissions: grant.permissions as any,
            grantId: grant.id,
            expiresAt: grant.expiresAt,
            grantedAt: grant.createdAt,
          });
        }
      }
    }
    
    return clients;
  };

  /**
   * Read latest body measurement for a client.
   */
  const readLatestBodyData = async (
    clientWebId: string
  ): Promise<ClientSummary['latestBodyData'] | undefined> => {
    try {
      // Derive storage root from client WebID
      const clientUrl = new URL(clientWebId);
      const clientStorage = `${clientUrl.protocol}//${clientUrl.host}/`;
      
      // Try current month
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      const containerUrl = `${clientStorage}fitpod/body/${year}/${month}/`;
      
      // List container
      const listResult = await options.solidIo.listContainer(containerUrl);
      if (!listResult.ok) return undefined;
      
      // Find most recent .ttl file
      const turtleFiles = listResult.value.filter(url => url.endsWith('.ttl'));
      if (turtleFiles.length === 0) return undefined;
      
      // Read first file (TODO: sort by date and get latest)
      const firstFile = turtleFiles[0];
      if (!firstFile) return undefined;
      
      const readResult = await options.solidIo.readTurtle(firstFile);
      if (!readResult.ok) return undefined;
      
      const { store } = readResult.value;
      const subject = `${firstFile}#it`;
      const subjectNode = namedNode(subject);
      
      const getValue = (predicate: string): string | undefined => {
        const quads = store.getQuads(
          subjectNode as any,
          namedNode(predicate) as any,
          null,
          null
        );
        return quads.length > 0 ? quads[0].object.value : undefined;
      };
      
      const weightKg = parseFloat(getValue(`${FP}weightKg`) ?? '0');
      const heightCm = parseFloat(getValue(`${FP}heightCm`) ?? '0');
      const date = getValue(`${FP}date`) ?? '';
      const bmi = heightCm > 0 ? weightKg / Math.pow(heightCm / 100, 2) : 0;
      
      return { date, weightKg, heightCm, bmi };
    } catch (error) {
      console.error(`Failed to read body data for ${clientWebId}:`, error);
      return undefined;
    }
  };

  /**
   * Read latest workout session for a client.
   */
  const readLatestWorkoutDate = async (
    clientWebId: string
  ): Promise<string | undefined> => {
    try {
      const clientUrl = new URL(clientWebId);
      const clientStorage = `${clientUrl.protocol}//${clientUrl.host}/`;
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      const containerUrl = `${clientStorage}fitpod/workout/${year}/${month}/`;
      
      const listResult = await options.solidIo.listContainer(containerUrl);
      if (!listResult.ok) return undefined;
      
      const turtleFiles = listResult.value.filter(url => url.endsWith('.ttl'));
      if (turtleFiles.length === 0) return undefined;
      
      // TODO: Parse dates and return latest
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.error(`Failed to read workout data for ${clientWebId}:`, error);
      return undefined;
    }
  };

  return {
    async listClients(): Promise<Result<ClientAccess[]>> {
      // Discovery challenge: find grants made BY others TO current user
      // MVP approach: Use local registry of client WebIDs
      
      // For demonstration, return discovered grants
      const clients = await discoverGrantsForProfessional();
      return success(clients);
    },

    async getClientSummary(clientWebId: string): Promise<Result<ClientSummary>> {
      // Extract profile name
      const name = await extractProfileName(clientWebId);
      
      // Read latest body data (if granted access)
      const latestBodyData = await readLatestBodyData(clientWebId);
      
      // Read latest workout date (if granted access)
      const latestWorkoutDate = await readLatestWorkoutDate(clientWebId);
      
      return success({
        webId: clientWebId,
        name,
        latestBodyData,
        latestWorkoutDate,
        accessScope: [], // TODO: Query access grants to determine scope
      });
    },

    async getClientDetail(clientWebId: string): Promise<Result<import('@/domain/professional/entities').ClientDetail>> {
      // For MVP: return basic summary as ClientDetail
      const summaryResult = await this.getClientSummary(clientWebId);
      if (!summaryResult.ok) return summaryResult;
      
      return success({
        ...summaryResult.value,
        // TODO: Add PAR-Q+ response, current routines, recommendations
      });
    },

    setWebId(newWebId: string): void {
      webId = newWebId;
    },
  };
};
