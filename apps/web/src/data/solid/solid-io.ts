/**
 * Solid I/O operations (L4 Data Access)
 * AR-02: Only L4 imports RDF libraries
 * Based on SAD 4.4 and 4.3
 */

import { Parser, Writer, Store } from 'n3';
import { appError, failure, success, type Result } from '@/domain/shared/result';
import type { PodHttp } from '@/infrastructure/http/pod-http';
import { handleHttpResponse } from '@/infrastructure/http/pod-http';

export interface SolidIo {
  readTurtle(url: string): Promise<Result<{ store: Store; etag: string | null }>>;
  listContainer(url: string): Promise<Result<string[]>>;
  putNew(url: string, store: Store): Promise<Result<void>>;
  putReplace(url: string, store: Store, etag: string): Promise<Result<void>>;
  deleteResource(url: string): Promise<Result<void>>;
}

class SolidIoImpl implements SolidIo {
  constructor(private http: PodHttp) {}

  async readTurtle(url: string): Promise<Result<{ store: Store; etag: string | null }>> {
    try {
      const response = await this.http.authed(url, {
        headers: {
          Accept: 'text/turtle',
        },
      });

      return handleHttpResponse(response, async (res) => {
        const text = await res.text();
        const parser = new Parser({ baseIRI: url });
        const store = new Store();

        return new Promise<{ store: Store; etag: string | null }>((resolve, reject) => {
          parser.parse(text, (error: Error | null, quad: any, _prefixes: any) => {
            if (error) {
              reject(error);
            } else if (quad) {
              store.addQuad(quad);
            } else {
              // Parsing complete
              const etag = res.headers.get('ETag');
              resolve({ store, etag });
            }
          });
        });
      });
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to read Turtle',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async listContainer(url: string): Promise<Result<string[]>> {
    try {
      const result = await this.readTurtle(url);
      
      if (!result.ok) {
        return result;
      }

      const { store } = result.value;
      const containerIri = url.endsWith('/') ? url : url + '/';
      
      // Find ldp:contains triples
      const contains = store.getQuads(
        containerIri as any,
        'http://www.w3.org/ns/ldp#contains',
        null,
        null
      );

      const children = contains.map((quad) => quad.object.value);
      return success(children);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to list container',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async putNew(url: string, store: Store): Promise<Result<void>> {
    try {
      const turtle = await this.serializeStore(store);
      const response = await this.http.authed(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/turtle',
          'If-None-Match': '*', // SAD 4.3: conditional write
        },
        body: turtle,
      });

      return handleHttpResponse(response, async () => undefined);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to create resource',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async putReplace(url: string, store: Store, etag: string): Promise<Result<void>> {
    try {
      const turtle = await this.serializeStore(store);
      const response = await this.http.authed(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/turtle',
          'If-Match': etag, // SAD 4.3: conditional write
        },
        body: turtle,
      });

      return handleHttpResponse(response, async () => undefined);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to update resource',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async deleteResource(url: string): Promise<Result<void>> {
    try {
      const response = await this.http.authed(url, {
        method: 'DELETE',
      });

      return handleHttpResponse(response, async () => undefined);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to delete resource',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  private async serializeStore(store: Store): Promise<string> {
    const writer = new Writer();
    return new Promise<string>((resolve, reject) => {
      writer.addQuads(store.getQuads(null, null, null, null));
      writer.end((error: Error | null, result: string) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }
}

export const createSolidIo = (http: PodHttp): SolidIo => {
  return new SolidIoImpl(http);
};
