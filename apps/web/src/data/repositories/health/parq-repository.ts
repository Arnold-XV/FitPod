/**
 * PAR-Q+ Repository Implementation (L4)
 * Implements ParQRepository port from L3
 */

import { DataFactory, Store } from 'n3';
import type { ParQRepository } from '@/domain/health/ports';
import type { ParQResponse } from '@/domain/health/entities';
import type { Result } from '@/domain/shared/result';
import { success, failure, appError } from '@/domain/shared/result';
import type { SolidIo } from '@/data/solid/solid-io';
import {
  FP_PARQ_RESPONSE,
  FP_Q1,
  FP_Q2,
  FP_Q3,
  FP_Q4,
  FP_Q5,
  FP_Q6,
  FP_Q7,
  FP_FOLLOW_UP_COMPLETED,
  FP_DATE,
  FP_SCHEMA_VERSION,
  RDF_TYPE,
  XSD_DATE,
  XSD_INTEGER,
  XSD_BOOLEAN,
} from '@fitpod/vocab';

const { namedNode, literal } = DataFactory;

export interface CreateParQRepositoryOptions {
  solidIo: SolidIo;
  storageRoot: string;
}

export const createParQRepository = (
  options: CreateParQRepositoryOptions
): ParQRepository => {
  let webId = '';
  let storageRoot = options.storageRoot;

  const getParQContainerUrl = (): string => {
    return `${storageRoot}fitpod/health/parq/`;
  };

  const getParQResourceUrl = (id: string): string => {
    return `${getParQContainerUrl()}${id}.ttl`;
  };

  const serializeParQ = (response: ParQResponse, url: string): Store => {
    const store = new Store();
    const subject = `${url}#it`;
    
    const quad = (p: string, o: string, datatype?: string) => {
      if (datatype) {
        return {
          subject: namedNode(subject),
          predicate: namedNode(p),
          object: literal(o, namedNode(datatype)),
        } as any;
      }
      return {
        subject: namedNode(subject),
        predicate: namedNode(p),
        object: namedNode(o),
      } as any;
    };

    // Type
    store.addQuad(quad(RDF_TYPE, FP_PARQ_RESPONSE));
    
    // Core fields
    store.addQuad(quad(FP_DATE, response.date, XSD_DATE));
    
    // Responses
    store.addQuad(quad(FP_Q1, String(response.responses.q1), XSD_BOOLEAN));
    store.addQuad(quad(FP_Q2, String(response.responses.q2), XSD_BOOLEAN));
    store.addQuad(quad(FP_Q3, String(response.responses.q3), XSD_BOOLEAN));
    store.addQuad(quad(FP_Q4, String(response.responses.q4), XSD_BOOLEAN));
    store.addQuad(quad(FP_Q5, String(response.responses.q5), XSD_BOOLEAN));
    store.addQuad(quad(FP_Q6, String(response.responses.q6), XSD_BOOLEAN));
    store.addQuad(quad(FP_Q7, String(response.responses.q7), XSD_BOOLEAN));
    
    store.addQuad(quad(FP_FOLLOW_UP_COMPLETED, String(response.followUpCompleted), XSD_BOOLEAN));
    
    // Schema version
    store.addQuad(quad(FP_SCHEMA_VERSION, String(response.schemaVersion), XSD_INTEGER));

    return store;
  };

  const parseParQ = (store: Store, url: string): ParQResponse => {
    const subject = `${url}#it`;
    const subjectNode = namedNode(subject);
    
    const getValue = (predicate: string): string | undefined => {
      const quads = store.getQuads(subjectNode as any, namedNode(predicate) as any, null, null);
      return quads.length > 0 ? quads[0].object.value : undefined;
    };
    
    const id = url.split('/').pop()?.replace('.ttl', '') ?? '';
    
    return {
      id,
      date: getValue(FP_DATE) ?? '',
      responses: {
        q1: getValue(FP_Q1) === 'true',
        q2: getValue(FP_Q2) === 'true',
        q3: getValue(FP_Q3) === 'true',
        q4: getValue(FP_Q4) === 'true',
        q5: getValue(FP_Q5) === 'true',
        q6: getValue(FP_Q6) === 'true',
        q7: getValue(FP_Q7) === 'true',
      },
      followUpCompleted: getValue(FP_FOLLOW_UP_COMPLETED) === 'true',
      schemaVersion: parseInt(getValue(FP_SCHEMA_VERSION) ?? '1'),
    };
  };

  return {
    async saveResponse(response: ParQResponse): Promise<Result<void>> {
      const url = getParQResourceUrl(response.id);
      const store = serializeParQ(response, url);
      
      return await options.solidIo.putNew(url, store);
    },

    async getLatestResponse(): Promise<Result<ParQResponse | null>> {
      const containerUrl = getParQContainerUrl();
      const listResult = await options.solidIo.listContainer(containerUrl);
      
      if (!listResult.ok) {
        if (listResult.error.type === 'NotFound') {
          return success(null);
        }
        return listResult;
      }
      
      const turtleFiles = listResult.value.filter(url => url.endsWith('.ttl'));
      if (turtleFiles.length === 0) return success(null);
      
      // Sort by filename (assumes ISO date format in filename)
      const sorted = turtleFiles.sort().reverse();
      const latestUrl = sorted[0];
      
      if (!latestUrl) return success(null);
      
      const readResult = await options.solidIo.readTurtle(latestUrl);
      if (!readResult.ok) return readResult;
      
      try {
        const response = parseParQ(readResult.value.store, latestUrl);
        return success(response);
      } catch (error) {
        return failure(
          appError(
            'ValidationFailed',
            'Failed to parse PAR-Q response',
            error instanceof Error ? error.message : String(error)
          )
        );
      }
    },

    async listResponses(): Promise<Result<ParQResponse[]>> {
      const containerUrl = getParQContainerUrl();
      const listResult = await options.solidIo.listContainer(containerUrl);
      
      if (!listResult.ok) {
        if (listResult.error.type === 'NotFound') {
          return success([]);
        }
        return listResult;
      }
      
      const responses: ParQResponse[] = [];
      for (const childUrl of listResult.value) {
        if (!childUrl.endsWith('.ttl')) continue;
        
        const readResult = await options.solidIo.readTurtle(childUrl);
        if (readResult.ok) {
          try {
            const response = parseParQ(readResult.value.store, childUrl);
            responses.push(response);
          } catch (error) {
            console.error(`Failed to parse PAR-Q ${childUrl}:`, error);
          }
        }
      }
      
      return success(responses);
    },

    setWebId(newWebId: string): void {
      webId = newWebId;
    },

    async ensureStorageRoot(): Promise<void> {
      if (!storageRoot && webId) {
        const url = new URL(webId);
        storageRoot = `${url.protocol}//${url.host}/`;
      }
    },
  };
};
