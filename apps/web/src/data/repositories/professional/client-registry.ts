import { DataFactory, Store } from 'n3';
import type { SolidIo } from '@/data/solid/solid-io';
import type { Result } from '@/domain/shared/result';
import { success, failure, appError } from '@/domain/shared/result';
import { FP, RDF_TYPE, XSD_DATETIME } from '@fitpod/vocab';

const { namedNode, literal } = DataFactory;

const FP_CLIENT_REGISTRY = `${FP}ClientRegistry`;
const FP_CLIENT_ENTRY = `${FP}ClientEntry`;
const FP_CLIENT_WEB_ID = `${FP}clientWebId`;
const FP_ADDED_AT = `${FP}addedAt`;

export interface ClientRegistryEntry {
  clientWebId: string;
  addedAt: string;
}

export interface ClientRegistry {
  listClients(): Promise<Result<ClientRegistryEntry[]>>;
  addClient(clientWebId: string): Promise<Result<void>>;
  removeClient(clientWebId: string): Promise<Result<void>>;
}

export const createClientRegistry = (
  solidIo: SolidIo,
  storageRoot: string
): ClientRegistry => {
  const getRegistryUrl = (): string => {
    return `${storageRoot}fitpod/professional/client-registry.ttl`;
  };

  const serializeRegistry = (entries: ClientRegistryEntry[], url: string): Store => {
    const store = new Store();
    const registrySubject = `${url}#registry`;
    
    // Registry type
    store.addQuad({
      subject: namedNode(registrySubject),
      predicate: namedNode(RDF_TYPE),
      object: namedNode(FP_CLIENT_REGISTRY),
    } as any);
    
    // Client entries
    entries.forEach((entry, index) => {
      const entrySubject = `${url}#entry${index}`;
      
      store.addQuad({
        subject: namedNode(entrySubject),
        predicate: namedNode(RDF_TYPE),
        object: namedNode(FP_CLIENT_ENTRY),
      } as any);
      
      store.addQuad({
        subject: namedNode(entrySubject),
        predicate: namedNode(FP_CLIENT_WEB_ID),
        object: namedNode(entry.clientWebId),
      } as any);
      
      store.addQuad({
        subject: namedNode(entrySubject),
        predicate: namedNode(FP_ADDED_AT),
        object: literal(entry.addedAt, namedNode(XSD_DATETIME)),
      } as any);
    });
    
    return store;
  };

  const parseRegistry = (store: Store): ClientRegistryEntry[] => {
    const entries: ClientRegistryEntry[] = [];
    
    // Find all ClientEntry subjects
    const entryQuads = store.getQuads(
      null,
      namedNode(RDF_TYPE) as any,
      namedNode(FP_CLIENT_ENTRY) as any,
      null
    );
    
    entryQuads.forEach(quad => {
      const entrySubject = quad.subject;
      
      const webIdQuads = store.getQuads(
        entrySubject as any,
        namedNode(FP_CLIENT_WEB_ID) as any,
        null,
        null
      );
      
      const addedAtQuads = store.getQuads(
        entrySubject as any,
        namedNode(FP_ADDED_AT) as any,
        null,
        null
      );
      
      if (webIdQuads.length > 0 && addedAtQuads.length > 0) {
        entries.push({
          clientWebId: webIdQuads[0].object.value,
          addedAt: addedAtQuads[0].object.value,
        });
      }
    });
    
    return entries;
  };

  return {
    async listClients(): Promise<Result<ClientRegistryEntry[]>> {
      const url = getRegistryUrl();
      const result = await solidIo.readTurtle(url);
      
      if (!result.ok) {
        if (result.error.type === 'NotFound') {
          return success([]);
        }
        return result;
      }
      
      try {
        const entries = parseRegistry(result.value.store);
        return success(entries);
      } catch (error) {
        return failure(
          appError(
            'ValidationFailed',
            'Failed to parse client registry',
            error instanceof Error ? error.message : String(error)
          )
        );
      }
    },

    async addClient(clientWebId: string): Promise<Result<void>> {
      const url = getRegistryUrl();
      
      // Read existing registry
      const listResult = await this.listClients();
      if (!listResult.ok) return listResult;
      
      const entries = listResult.value;
      
      // Check if already exists
      if (entries.some(e => e.clientWebId === clientWebId)) {
        return success(undefined); // Already registered
      }
      
      // Add new entry
      entries.push({
        clientWebId,
        addedAt: new Date().toISOString(),
      });
      
      // Serialize and write
      const store = serializeRegistry(entries, url);
      return await solidIo.putNew(url, store);
    },

    async removeClient(clientWebId: string): Promise<Result<void>> {
      const url = getRegistryUrl();
      
      // Read existing registry
      const listResult = await this.listClients();
      if (!listResult.ok) return listResult;
      
      const entries = listResult.value.filter(e => e.clientWebId !== clientWebId);
      
      // Serialize and write
      const store = serializeRegistry(entries, url);
      
      // Read for ETag
      const currentResult = await solidIo.readTurtle(url);
      if (!currentResult.ok) return currentResult;
      
      const { etag } = currentResult.value;
      if (!etag) {
        return failure(appError('Conflict', 'No ETag for conditional update'));
      }
      
      return await solidIo.putReplace(url, store, etag);
    },
  };
};
