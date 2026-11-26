import { DataFactory, Store } from 'n3';
import type { AccessRepository } from '@/domain/access/ports';
import type { AccessGrant } from '@/domain/access/entities';
import type { Result } from '@/domain/shared/result';
import { success, failure, appError } from '@/domain/shared/result';
import type { SolidIo } from '@/data/solid/solid-io';
import {
  FP_ACCESS_GRANT,
  FP_GRANTED_TO,
  FP_GRANTED_BY,
  FP_SCOPE,
  FP_PERMISSIONS,
  FP_EXPIRES_AT,
  FP_CREATED_AT,
  FP_REVOKED_AT,
  FP_SCHEMA_VERSION,
  RDF_TYPE,
  XSD_DATETIME,
  XSD_INTEGER,
} from '@fitpod/vocab';
import { createAclManager, type AclManager } from '@/data/acl/acl-manager';
import { scopeToContainerPaths, permissionToModes } from '@/data/acl/acl-builder';

const { namedNode, literal } = DataFactory;

export interface CreateAccessRepositoryOptions {
  solidIo: SolidIo;
  storageRoot: string;
}

export const createAccessRepository = (
  options: CreateAccessRepositoryOptions
): AccessRepository => {
  let webId = '';
  let storageRoot = options.storageRoot;
  let aclManager: AclManager | null = null;

  const getAclManager = (): AclManager => {
    if (!aclManager) {
      if (!webId) {
        throw new Error('WebId must be set before accessing AclManager');
      }
      aclManager = createAclManager({
        podHttp: options.solidIo.getHttp(),
        ownerWebId: webId,
      });
    }
    return aclManager;
  };

  const getGrantsContainerUrl = (): string => {
    return `${storageRoot}fitpod/access/grants/`;
  };

  const getGrantResourceUrl = (id: string): string => {
    return `${getGrantsContainerUrl()}${id}.ttl`;
  };

  /**
   * Serialize AccessGrant to N3 Store.
   */
  const serializeGrant = (grant: AccessGrant, url: string): Store => {
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
    store.addQuad(quad(RDF_TYPE, FP_ACCESS_GRANT));
    
    // Core fields
    store.addQuad(quad(FP_GRANTED_TO, grant.grantedTo));
    store.addQuad(quad(FP_GRANTED_BY, grant.grantedBy));
    
    // Scope (multiple values)
    grant.scope.forEach(s => {
      store.addQuad(quad(FP_SCOPE, s));
    });
    
    // Permissions
    store.addQuad(quad(FP_PERMISSIONS, grant.permissions));
    
    // Timestamps
    store.addQuad(quad(FP_CREATED_AT, grant.createdAt, XSD_DATETIME));
    if (grant.expiresAt) {
      store.addQuad(quad(FP_EXPIRES_AT, grant.expiresAt, XSD_DATETIME));
    }
    if (grant.revokedAt) {
      store.addQuad(quad(FP_REVOKED_AT, grant.revokedAt, XSD_DATETIME));
    }
    
    // Schema version
    store.addQuad(
      quad(FP_SCHEMA_VERSION, String(grant.schemaVersion), XSD_INTEGER)
    );

    return store;
  };

  /**
   * Parse AccessGrant from N3 Store.
   */
  const parseGrant = (store: Store, url: string): AccessGrant => {
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
    
    // Extract ID from URL
    const id = url.split('/').pop()?.replace('.ttl', '') ?? '';
    
    return {
      id,
      grantedTo: getValue(FP_GRANTED_TO) ?? '',
      grantedBy: getValue(FP_GRANTED_BY) ?? '',
      scope: getValues(FP_SCOPE) as any[],
      permissions: getValue(FP_PERMISSIONS) as any,
      createdAt: getValue(FP_CREATED_AT) ?? '',
      expiresAt: getValue(FP_EXPIRES_AT),
      revokedAt: getValue(FP_REVOKED_AT),
      schemaVersion: parseInt(getValue(FP_SCHEMA_VERSION) ?? '1'),
    };
  };

  return {
    async listGrants(): Promise<Result<AccessGrant[]>> {
      const containerUrl = getGrantsContainerUrl();
      
      // List container
      const listResult = await options.solidIo.listContainer(containerUrl);
      if (!listResult.ok) {
        // If container doesn't exist, return empty array
        if (listResult.error.type === 'NotFound') {
          return success([]);
        }
        return listResult;
      }
      
      // Read each grant file
      const grants: AccessGrant[] = [];
      for (const childUrl of listResult.value) {
        if (!childUrl.endsWith('.ttl')) continue;
        
        const readResult = await options.solidIo.readTurtle(childUrl);
        if (readResult.ok) {
          try {
            const grant = parseGrant(readResult.value.store, childUrl);
            grants.push(grant);
          } catch (error) {
            console.error(`Failed to parse grant ${childUrl}:`, error);
          }
        }
      }
      
      return success(grants);
    },

    async getGrant(id: string): Promise<Result<AccessGrant | null>> {
      const url = getGrantResourceUrl(id);
      const result = await options.solidIo.readTurtle(url);
      
      if (!result.ok) {
        if (result.error.type === 'NotFound') {
          return success(null);
        }
        return result;
      }
      
      try {
        const grant = parseGrant(result.value.store, url);
        return success(grant);
      } catch (error) {
        return failure(
          appError(
            'ValidationFailed',
            'Failed to parse grant',
            error instanceof Error ? error.message : String(error)
          )
        );
      }
    },

    async createGrant(grant: AccessGrant): Promise<Result<void>> {
      // 1. Serialize grant to Turtle
      const url = getGrantResourceUrl(grant.id);
      const store = serializeGrant(grant, url);
      
      // 2. Write grant resource
      const writeResult = await options.solidIo.putNew(url, store);
      if (!writeResult.ok) return writeResult;
      
      // 3. Update ACL for scope containers
      const containerPaths = scopeToContainerPaths(storageRoot, grant.scope);
      const modes = permissionToModes(grant.permissions);
      
      for (const containerPath of containerPaths) {
        const aclResult = await getAclManager().grantContainerAccess(
          containerPath,
          grant.grantedTo,
          modes
        );
        
        if (!aclResult.ok) {
          console.error(`Failed to update ACL for ${containerPath}:`, aclResult.error);
          // Continue with other containers even if one fails
        }
      }
      
      return success(undefined);
    },

    async revokeGrant(id: string): Promise<Result<void>> {
      // 1. Read grant to get scope
      const grantResult = await this.getGrant(id);
      if (!grantResult.ok) return grantResult;
      if (!grantResult.value) {
        return failure(appError('NotFound', 'Grant not found'));
      }
      
      const grant = grantResult.value;
      
      // 2. Mark as revoked (update with revokedAt timestamp)
      const now = new Date().toISOString();
      const revokedGrant: AccessGrant = {
        ...grant,
        revokedAt: now,
      };
      
      const url = getGrantResourceUrl(id);
      const store = serializeGrant(revokedGrant, url);
      
      // Read for ETag
      const currentResult = await options.solidIo.readTurtle(url);
      if (!currentResult.ok) return currentResult;
      
      const { etag } = currentResult.value;
      if (!etag) {
        return failure(appError('Conflict', 'No ETag for conditional update'));
      }
      
      const updateResult = await options.solidIo.putReplace(url, store, etag);
      if (!updateResult.ok) return updateResult;
      
      // 3. Update ACL to remove permissions
      const containerPaths = scopeToContainerPaths(storageRoot, grant.scope);
      
      for (const containerPath of containerPaths) {
        const aclResult = await getAclManager().revokeContainerAccess(
          containerPath,
          grant.grantedTo
        );
        
        if (!aclResult.ok) {
          console.error(`Failed to revoke ACL for ${containerPath}:`, aclResult.error);
        }
      }
      
      return success(undefined);
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
