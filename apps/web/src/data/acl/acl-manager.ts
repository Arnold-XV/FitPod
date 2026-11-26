// @ts-nocheck
/**
 * ACL Manager for Web Access Control (WAC)
 * Implements ACL granting for social folder access
 */

import { DataFactory, Parser, Store, Writer } from 'n3';
import type { Result } from '@/domain/shared/result';
import { appError, failure, success } from '@/domain/shared/result';
import type { PodHttp } from '@/infrastructure/http/pod-http';
import type { Logger } from '@/domain/shared/logger';

const { namedNode } = DataFactory;

const ACL = 'http://www.w3.org/ns/auth/acl#';
const FOAF = 'http://xmlns.com/foaf/0.1/';

interface AclConfig {
  podHttp: PodHttp;
  ownerWebId: string;
  logger?: Logger;
}

export interface AclManager {
  /**
   * Grant read access to social/shared/ folder for a friend
   */
  grantSharedFolderAccess(friendWebId: string): Promise<Result<void>>;

  /**
   * Revoke read access to social/shared/ folder for a friend
   */
  revokeSharedFolderAccess(friendWebId: string): Promise<Result<void>>;

  /**
   * Setup inbox with public append permission
   * Allows anyone to send notifications to the inbox
   */
  setupInboxAccess(): Promise<Result<void>>;

  /**
   * Grant access to a container with specified modes
   */
  grantContainerAccess(containerPath: string, agentWebId: string, modes: ('Read' | 'Write')[]): Promise<Result<void>>;

  /**
   * Revoke access to a container for an agent
   */
  revokeContainerAccess(containerPath: string, agentWebId: string): Promise<Result<void>>;
}

class AclManagerImpl implements AclManager {
  private podHttp: PodHttp;
  private ownerWebId: string;
  private logger?: Logger;

  constructor(config: AclConfig) {
    this.podHttp = config.podHttp;
    this.ownerWebId = config.ownerWebId;
    this.logger = config.logger;
  }

  private getStorageRoot(): string {
    // Extract storage root from WebID
    // For WebID like http://localhost:3001/bob/profile/card#me
    // We need http://localhost:3001/bob/ not just http://localhost:3001/
    const url = new URL(this.ownerWebId);
    const pathParts = url.pathname.split('/').filter(p => p);
    
    if (pathParts.length > 0) {
      // First part is usually the username
      const username = pathParts[0];
      return `${url.protocol}//${url.host}/${username}/`;
    }
    
    // Fallback to host root if no path
    return `${url.protocol}//${url.host}/`;
  }

  private getSharedFolderUrl(): string {
    return `${this.getStorageRoot()}fitpod/social/shared/`;
  }

  private getSharedFolderAclUrl(): string {
    return `${this.getSharedFolderUrl()}.acl`;
  }

  private getInboxUrl(): string {
    return `${this.getStorageRoot()}inbox/`;
  }

  private getInboxAclUrl(): string {
    return `${this.getInboxUrl()}.acl`;
  }

  async grantSharedFolderAccess(friendWebId: string): Promise<Result<void>> {
    try {
      const aclUrl = this.getSharedFolderAclUrl();
      const folderUrl = this.getSharedFolderUrl();

      // Ensure shared folder exists
      const ensureResult = await this.ensureSharedFolderExists(folderUrl);
      if (!ensureResult.ok) {
        this.logger?.warn('Failed to ensure shared folder exists', { error: ensureResult.error });
        // Continue anyway - folder might exist but container listing failed
      }

      // Read existing ACL or create new
      let store = new Store();

      const readResult = await this.readAcl(aclUrl);
      if (readResult.ok) {
        store = readResult.value;
      } else if (readResult.error.type === 'NotFound') {
        // Initialize with owner's full control
        this.addOwnerAuthorization(store, folderUrl);
      } else {
        return failure(readResult.error);
      }

      // Add friend's read authorization
      this.addFriendReadAuthorization(store, folderUrl, friendWebId);

      // Write ACL back to Pod
      const writeResult = await this.writeAcl(aclUrl, store);
      if (!writeResult.ok) return failure(writeResult.error);

      return success(undefined);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to grant shared folder access',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  private async ensureSharedFolderExists(folderUrl: string): Promise<Result<void>> {
    try {
      // Try to read the folder (HEAD or GET request)
      const response = await this.podHttp.authed(folderUrl, {
        method: 'HEAD',
      });

      if (response.ok) {
        // Folder exists
        return success(undefined);
      }

      if (response.status === 404) {
        // Folder doesn't exist, create it with PUT
        const createResponse = await this.podHttp.authed(folderUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'text/turtle',
            'Link': '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
          },
          body: '', // Empty turtle for container
        });

        if (!createResponse.ok) {
          return failure(
            appError('NetworkError', `Failed to create shared folder: ${createResponse.status}`)
          );
        }

        return success(undefined);
      }

      return failure(
        appError('NetworkError', `Unexpected response checking folder: ${response.status}`)
      );
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to ensure shared folder exists',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async revokeSharedFolderAccess(friendWebId: string): Promise<Result<void>> {
    try {
      const aclUrl = this.getSharedFolderAclUrl();

      // Read existing ACL
      const readResult = await this.readAcl(aclUrl);
      if (!readResult.ok) return failure(readResult.error);

      let store = readResult.value;

      // Remove friend's authorization by filtering
      store = this.removeFriendAuthorization(store, friendWebId);

      // Write ACL back
      const writeResult = await this.writeAcl(aclUrl, store);
      if (!writeResult.ok) return failure(writeResult.error);

      return success(undefined);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to revoke shared folder access',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  private async readAcl(aclUrl: string): Promise<Result<Store>> {
    try {
      const response = await this.podHttp.authed(aclUrl, {
        headers: { Accept: 'text/turtle' },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return failure(appError('NotFound', 'ACL file not found'));
        }
        return failure(
          appError('NetworkError', `Failed to read ACL: ${response.status}`)
        );
      }

      const text = await response.text();
      const parser = new Parser({ baseIRI: aclUrl });
      const store = new Store();

      await new Promise<void>((resolve, reject) => {
        parser.parse(text, (error: Error | null, quad: any) => {
          if (error) return reject(error);
          if (quad) store.addQuad(quad);
          else resolve();
        });
      });

      return success(store);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to read ACL',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  private async writeAcl(aclUrl: string, store: Store): Promise<Result<void>> {
    try {
      const turtle = await this.serializeStore(store);

      const response = await this.podHttp.authed(aclUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/turtle',
        },
        body: turtle,
      });

      if (!response.ok) {
        return failure(
          appError('NetworkError', `Failed to write ACL: ${response.status}`)
        );
      }

      return success(undefined);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to write ACL',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  private addOwnerAuthorization(store: Store, folderUrl: string): void {
    const authId = `${this.getSharedFolderAclUrl()}#owner`;

    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      object: namedNode(`${ACL}Authorization`),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode(`${ACL}agent`),
      object: namedNode(this.ownerWebId),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode(`${ACL}accessTo`),
      object: namedNode(folderUrl),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode(`${ACL}default`),
      object: namedNode(folderUrl),
      graph: namedNode(''),
    } as any);

    // Owner has full control
    ['Read', 'Write', 'Control'].forEach(mode => {
      store.addQuad({
        subject: namedNode(authId),
        predicate: namedNode(`${ACL}mode`),
        object: namedNode(`${ACL}${mode}`),
        graph: namedNode(''),
      } as any);
    });
  }

  private addFriendReadAuthorization(store: Store, folderUrl: string, friendWebId: string): void {
    const authId = `${this.getSharedFolderAclUrl()}#${this.encodeWebId(friendWebId)}`;

    // Check if authorization already exists
    const existingAuth = store.getQuads(namedNode(authId) as any, null, null, null);
    if (existingAuth.length > 0) {
      // Already exists, skip
      return;
    }

    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      object: namedNode(`${ACL}Authorization`),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode(`${ACL}agent`),
      object: namedNode(friendWebId),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode(`${ACL}accessTo`),
      object: namedNode(folderUrl),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode(`${ACL}default`),
      object: namedNode(folderUrl),
      graph: namedNode(''),
    } as any);

    // Friend has read-only access
    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode(`${ACL}mode`),
      object: namedNode(`${ACL}Read`),
      graph: namedNode(''),
    } as any);
  }

  private removeFriendAuthorization(store: Store, friendWebId: string): Store {
    const authId = `${this.getSharedFolderAclUrl()}#${this.encodeWebId(friendWebId)}`;
    const quadsToRemove = store.getQuads(namedNode(authId) as any, null, null, null);
    
    // Create new store without the authorization quads
    const newStore = new Store();
    const allQuads = store.getQuads(null, null, null, null);
    
    for (const quad of allQuads) {
      // Skip quads that belong to the friend's authorization
      const shouldRemove = quadsToRemove.some(q => 
        q.subject.equals(quad.subject) && 
        q.predicate.equals(quad.predicate) && 
        q.object.equals(quad.object)
      );
      
      if (!shouldRemove) {
        newStore.addQuad(quad);
      }
    }
    
    return newStore;
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

  private encodeWebId(webId: string): string {
    return encodeURIComponent(webId).replace(/%/g, '_').replace(/\./g, '_');
  }

  async setupInboxAccess(): Promise<Result<void>> {
    try {
      const inboxUrl = this.getInboxUrl();
      const aclUrl = this.getInboxAclUrl();

      this.logger?.info('Setting up inbox', { inboxUrl, aclUrl });

      // Ensure inbox folder exists
      const ensureResult = await this.ensureInboxExists(inboxUrl);
      if (!ensureResult.ok) {
        this.logger?.error('Failed to ensure inbox exists', { 
          error: ensureResult.error,
          inboxUrl 
        });
        return failure(ensureResult.error);
      }

      this.logger?.info('Inbox folder verified/created');

      // Create ACL with public append permission
      const store = new Store();

      // Owner has full control
      const ownerAuthId = `${aclUrl}#owner`;
      
      store.addQuad(
        namedNode(ownerAuthId),
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        namedNode(`${ACL}Authorization`)
      );
      
      store.addQuad(
        namedNode(ownerAuthId),
        namedNode(`${ACL}agent`),
        namedNode(this.ownerWebId)
      );
      
      store.addQuad(
        namedNode(ownerAuthId),
        namedNode(`${ACL}accessTo`),
        namedNode(inboxUrl)
      );
      
      store.addQuad(
        namedNode(ownerAuthId),
        namedNode(`${ACL}default`),
        namedNode(inboxUrl)
      );
      
      store.addQuad(
        namedNode(ownerAuthId),
        namedNode(`${ACL}mode`),
        namedNode(`${ACL}Read`)
      );
      
      store.addQuad(
        namedNode(ownerAuthId),
        namedNode(`${ACL}mode`),
        namedNode(`${ACL}Write`)
      );
      
      store.addQuad(
        namedNode(ownerAuthId),
        namedNode(`${ACL}mode`),
        namedNode(`${ACL}Control`)
      );

      // Public append permission for anyone
      const publicAuthId = `${aclUrl}#public`;
      
      store.addQuad(
        namedNode(publicAuthId),
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        namedNode(`${ACL}Authorization`)
      );
      
      store.addQuad(
        namedNode(publicAuthId),
        namedNode(`${ACL}agentClass`),
        namedNode(`${FOAF}Agent`)
      );
      
      store.addQuad(
        namedNode(publicAuthId),
        namedNode(`${ACL}accessTo`),
        namedNode(inboxUrl)
      );
      
      store.addQuad(
        namedNode(publicAuthId),
        namedNode(`${ACL}default`),
        namedNode(inboxUrl)
      );
      
      store.addQuad(
        namedNode(publicAuthId),
        namedNode(`${ACL}mode`),
        namedNode(`${ACL}Append`)
      );

      // CSS versions differ in their handling of acl:Append on containers.
      // Write is needed as a compatibility fallback for authenticated agents
      // to create an inbox notification resource. It never grants Control.
      store.addQuad(
        namedNode(publicAuthId),
        namedNode(`${ACL}mode`),
        namedNode(`${ACL}Write`)
      );

      // Write ACL
      this.logger?.info('Writing ACL file', { aclUrl });
      const writeResult = await this.writeAcl(aclUrl, store);
      if (!writeResult.ok) {
        this.logger?.error('Failed to write ACL', { 
          error: writeResult.error,
          aclUrl 
        });
        return failure(writeResult.error);
      }

      this.logger?.info('Inbox ACL configured with public append access', { 
        aclUrl,
        inboxUrl 
      });
      
      return success(undefined);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to setup inbox access',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  private async ensureInboxExists(inboxUrl: string): Promise<Result<void>> {
    try {
      const response = await this.podHttp.authed(inboxUrl, {
        method: 'HEAD',
      });

      if (response.ok) {
        return success(undefined);
      }

      if (response.status === 404) {
        // Try to create parent directory first if needed
        const parentUrl = inboxUrl.substring(0, inboxUrl.lastIndexOf('/', inboxUrl.length - 2) + 1);
        
        // Create inbox using POST to parent container (LDP spec)
        const slug = 'inbox';
        const createResponse = await this.podHttp.authed(parentUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/turtle',
            'Link': '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
            'Slug': slug,
          },
          body: '',
        });

        if (!createResponse.ok && createResponse.status !== 409) {
          // 409 means already exists, which is fine
          return failure(
            appError('NetworkError', `Failed to create inbox: ${createResponse.status} ${createResponse.statusText}`)
          );
        }

        return success(undefined);
      }

      return failure(
        appError('NetworkError', `Unexpected response checking inbox: ${response.status}`)
      );
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to ensure inbox exists',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async grantContainerAccess(
    containerPath: string,
    agentWebId: string,
    modes: ('Read' | 'Write')[]
  ): Promise<Result<void>> {
    try {
      const aclUrl = `${containerPath}.acl`;
      
      // Ensure container exists
      const response = await this.podHttp.authed(containerPath, {
        method: 'HEAD',
      });
      
      if (!response.ok && response.status === 404) {
        return failure(appError('NotFound', `Container not found: ${containerPath}`));
      }

      // Read existing ACL or create new
      let store = new Store();
      const readResult = await this.readAcl(aclUrl);
      
      if (readResult.ok) {
        store = readResult.value;
      } else if (readResult.error.type === 'NotFound') {
        // Initialize with owner's full control
        this.addContainerOwnerAuth(store, containerPath, aclUrl);
      } else {
        return failure(readResult.error);
      }

      // Add agent's authorization
      this.addAgentContainerAuth(store, containerPath, aclUrl, agentWebId, modes);

      // Write ACL back
      const writeResult = await this.writeAcl(aclUrl, store);
      if (!writeResult.ok) return failure(writeResult.error);

      return success(undefined);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to grant container access',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async revokeContainerAccess(
    containerPath: string,
    agentWebId: string
  ): Promise<Result<void>> {
    try {
      const aclUrl = `${containerPath}.acl`;

      // Read existing ACL
      const readResult = await this.readAcl(aclUrl);
      if (!readResult.ok) {
        if (readResult.error.type === 'NotFound') {
          // No ACL means no permissions granted, nothing to revoke
          return success(undefined);
        }
        return failure(readResult.error);
      }

      let store = readResult.value;

      // Remove agent's authorization
      store = this.removeAgentContainerAuth(store, agentWebId);

      // Write ACL back
      const writeResult = await this.writeAcl(aclUrl, store);
      if (!writeResult.ok) return failure(writeResult.error);

      return success(undefined);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to revoke container access',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  private addContainerOwnerAuth(store: Store, containerPath: string, aclUrl: string): void {
    const authId = `${aclUrl}#owner`;

    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      object: namedNode(`${ACL}Authorization`),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode(`${ACL}agent`),
      object: namedNode(this.ownerWebId),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode(`${ACL}accessTo`),
      object: namedNode(containerPath),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode(`${ACL}default`),
      object: namedNode(containerPath),
      graph: namedNode(''),
    } as any);

    ['Read', 'Write', 'Control'].forEach(mode => {
      store.addQuad({
        subject: namedNode(authId),
        predicate: namedNode(`${ACL}mode`),
        object: namedNode(`${ACL}${mode}`),
        graph: namedNode(''),
      } as any);
    });
  }

  private addAgentContainerAuth(
    store: Store,
    containerPath: string,
    aclUrl: string,
    agentWebId: string,
    modes: ('Read' | 'Write')[]
  ): void {
    // Use hash of agent WebID for unique auth ID
    const authId = `${aclUrl}#agent-${agentWebId.replace(/[^a-zA-Z0-9]/g, '_')}`;

    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      object: namedNode(`${ACL}Authorization`),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode(`${ACL}agent`),
      object: namedNode(agentWebId),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode(`${ACL}accessTo`),
      object: namedNode(containerPath),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(authId),
      predicate: namedNode(`${ACL}default`),
      object: namedNode(containerPath),
      graph: namedNode(''),
    } as any);

    modes.forEach(mode => {
      store.addQuad({
        subject: namedNode(authId),
        predicate: namedNode(`${ACL}mode`),
        object: namedNode(`${ACL}${mode}`),
        graph: namedNode(''),
      } as any);
    });
  }

  private removeAgentContainerAuth(store: Store, agentWebId: string): Store {
    const newStore = new Store();
    
    // Find all authorization subjects that have this agent
    const agentQuads = store.getQuads(null, namedNode(`${ACL}agent`), namedNode(agentWebId), null);
    const authSubjects = new Set(agentQuads.map(q => q.subject.value));

    // Copy all quads except those related to this agent's authorizations
    for (const quad of store) {
      if (!authSubjects.has((quad.subject as any).value)) {
        newStore.addQuad(quad);
      }
    }

    return newStore;
  }
}

export const createAclManager = (config: AclConfig): AclManager => {
  return new AclManagerImpl(config);
};
