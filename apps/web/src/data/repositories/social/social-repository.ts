/**
 * Social Repository Implementation (L4)
 * Implements SocialRepository port from L3
 * Handles connections, friend requests (inbox), and shared activities
 */

import { DataFactory, Parser, Store } from 'n3';
import type { SocialRepository } from '@/domain/social/ports';
import type { Connection, FriendRequest, SharedActivity, ConnectionStatus } from '@/domain/social/entities';
import { validateConnection, validateSharedActivity } from '@/domain/social/entities';
import { appError, failure, success, type Result } from '@/domain/shared/result';
import type { SolidIo } from '@/data/solid/solid-io';
import { PIM } from '@fitpod/vocab';

const { namedNode, literal } = DataFactory;

// Vocabularies
const FP = 'https://w3id.org/fitpod/ns#';
const XSD = 'http://www.w3.org/2001/XMLSchema#';
const AS = 'https://www.w3.org/ns/activitystreams#';
const LDP = 'http://www.w3.org/ns/ldp#';

interface SocialRepositoryConfig {
  solidIo: SolidIo;
  storageRoot?: string;
}

class SocialRepositoryImpl implements SocialRepository {
  private solidIo: SolidIo;
  private _storageRoot: string = '';
  private _webId?: string;
  private _storageRootDiscovered: boolean = false;

  constructor(config: SocialRepositoryConfig) {
    this.solidIo = config.solidIo;
    if (config.storageRoot && config.storageRoot.length > 0) {
      this._storageRoot = config.storageRoot;
      this._storageRootDiscovered = true;
    }
  }

  setWebId(webId: string): void {
    this._webId = webId;
  }

  async ensureStorageRoot(): Promise<void> {
    if (this._storageRootDiscovered || !this._webId) {
      return;
    }

    try {
      const response = await this.solidIo.getHttp().authed(this._webId, {
        headers: { Accept: 'text/turtle' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch WebID document: ${response.status}`);
      }

      const text = await response.text();
      const parser = new Parser({ baseIRI: this._webId });
      const store = new Store();

      await new Promise<void>((resolve, reject) => {
        parser.parse(text, (error: Error | null, quad: any) => {
          if (error) return reject(error);
          if (quad) store.addQuad(quad);
          else resolve();
        });
      });

      const webIdNode = namedNode(this._webId);
      const pimStoragePredicate = namedNode(`${PIM}storage`);
      const storageQuads = store.getQuads(webIdNode as any, pimStoragePredicate as any, null, null);

      if (storageQuads.length > 0) {
        this._storageRoot = storageQuads[0].object.value;
        console.log(`[SocialRepository] Discovered storage root: ${this._storageRoot}`);
      } else {
        const url = new URL(this._webId);
        const pathParts = url.pathname.split('/').filter(Boolean);
        // Skip 'profile' segment for solidcommunity.net WebIDs
        const username = pathParts[0] === 'profile' ? '' : pathParts[0];
        this._storageRoot = username
          ? `${url.protocol}//${url.host}/${username}/`
          : `${url.protocol}//${url.host}/`;
        console.log(`[SocialRepository] Fallback storage root: ${this._storageRoot}`);
      }
    } catch (error) {
      console.warn(`[SocialRepository] Failed to discover storage root: ${error}`);
      if (this._webId) {
        const url = new URL(this._webId);
        const pathParts = url.pathname.split('/').filter(Boolean);
        // Skip 'profile' segment for solidcommunity.net WebIDs
        const username = pathParts[0] === 'profile' ? '' : pathParts[0];
        this._storageRoot = username
          ? `${url.protocol}//${url.host}/${username}/`
          : `${url.protocol}//${url.host}/`;
      }
    }

    this._storageRootDiscovered = true;
  }

  private getSocialContainerUrl(): string {
    return `${this._storageRoot}fitpod/social/`;
  }

  private getConnectionsUrl(): string {
    return `${this.getSocialContainerUrl()}connections.ttl`;
  }

  private getInboxUrl(): string {
    return `${this._storageRoot}inbox/`;
  }

  private getSharedActivitiesUrl(webId?: string): string {
    // If webId provided, construct URL for peer's Pod, otherwise own Pod
    if (webId) {
      const url = new URL(webId);
      // Extract storage root from WebID - typically protocol://host/username/
      const pathParts = url.pathname.split('/').filter(p => p);
      const username = pathParts[0]; // First path segment is username
      const storageRoot = `${url.protocol}//${url.host}/${username}/`;
      console.log('[SocialRepository] Constructed shared URL for peer:', { webId, storageRoot, sharedUrl: `${storageRoot}fitpod/social/shared/` });
      return `${storageRoot}fitpod/social/shared/`;
    }
    return `${this.getSocialContainerUrl()}shared/`;
  }

  // ========== CONNECTIONS ==========

  async listConnections(): Promise<Result<Connection[]>> {
    await this.ensureStorageRoot();

    try {
      const url = this.getConnectionsUrl();
      const result = await this.solidIo.readTurtle(url);

      if (!result.ok) {
        // File might not exist yet
        if (result.error.type === 'NotFound') {
          return success([]);
        }
        return failure(result.error);
      }

      const connections: Connection[] = [];
      const store = result.value.store;

      // Find all connection subjects
      const subjects = new Set<string>();
      store.getQuads(null, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type') as any, namedNode(`${FP}Connection`) as any, null)
        .forEach(q => subjects.add(q.subject.value));

      for (const subjectUri of subjects) {
        try {
          const connection = this.parseConnection(store, subjectUri);
          connections.push(connection);
        } catch (error) {
          console.warn(`Failed to parse connection ${subjectUri}:`, error);
        }
      }

      return success(connections);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to list connections',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async getConnection(peerWebId: string): Promise<Result<Connection | null>> {
    const result = await this.listConnections();
    if (!result.ok) return failure(result.error);

    const connection = result.value.find(c => c.peerWebId === peerWebId);
    return success(connection ?? null);
  }

  async addConnection(connection: Connection): Promise<Result<void>> {
    const validation = validateConnection(connection);
    if (!validation.valid) {
      return failure(appError('ValidationFailed', 'Invalid connection', validation.errors));
    }

    await this.ensureStorageRoot();

    try {
      // Read existing connections
      const url = this.getConnectionsUrl();
      let store = new Store();
      let etag: string | null = null;

      const readResult = await this.solidIo.readTurtle(url);
      if (readResult.ok) {
        store = readResult.value.store;
        etag = readResult.value.etag;
      }

      // Add new connection
      const subjectUri = `${url}#${this.encodeId(connection.peerWebId)}`;
      this.serializeConnection(store, connection, subjectUri);

      // Write back
      if (etag) {
        return await this.solidIo.putReplace(url, store, etag);
      } else {
        return await this.solidIo.putNew(url, store);
      }
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to add connection',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async updateConnection(connection: Connection): Promise<Result<void>> {
    const validation = validateConnection(connection);
    if (!validation.valid) {
      return failure(appError('ValidationFailed', 'Invalid connection', validation.errors));
    }

    await this.ensureStorageRoot();

    try {
      const url = this.getConnectionsUrl();
      const readResult = await this.solidIo.readTurtle(url);
      if (!readResult.ok) return failure(readResult.error);

      const { store, etag } = readResult.value;
      if (!etag) {
        return failure(appError('Conflict', 'No ETag found'));
      }

      // Remove old triples for this connection by creating new store
      const subjectUri = `${url}#${this.encodeId(connection.peerWebId)}`;
      const newStore = this.removeQuadsForSubject(store, subjectUri);

      // Add updated connection
      this.serializeConnection(newStore, connection, subjectUri);

      return await this.solidIo.putReplace(url, newStore, etag);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to update connection',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async removeConnection(peerWebId: string): Promise<Result<void>> {
    await this.ensureStorageRoot();

    try {
      const url = this.getConnectionsUrl();
      const readResult = await this.solidIo.readTurtle(url);
      if (!readResult.ok) return failure(readResult.error);

      const { store, etag } = readResult.value;
      if (!etag) {
        return failure(appError('Conflict', 'No ETag found'));
      }

      const subjectUri = `${url}#${this.encodeId(peerWebId)}`;
      const newStore = this.removeQuadsForSubject(store, subjectUri);

      return await this.solidIo.putReplace(url, newStore, etag);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to remove connection',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  // ========== FRIEND REQUESTS (INBOX) ==========

  async sendFriendRequest(toWebId: string, fromWebId: string): Promise<Result<void>> {
    try {
      // Discover recipient's inbox URL from their WebID document
      const inboxDiscovery = await this.discoverInboxUrl(toWebId);
      if (!inboxDiscovery.ok) {
        return failure(
          appError(
            'NotFound',
            `Could not discover inbox for ${toWebId}. Make sure the Pod is accessible.`,
            inboxDiscovery.error
          )
        );
      }

      const toInboxUrl = inboxDiscovery.value;

      // Create friend request notification
      const requestId = `friend-request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const requestUrl = `${toInboxUrl}${requestId}.ttl`;

      const store = new Store();
      const subject = `${requestUrl}#notification`;

      store.addQuad({
        subject: namedNode(subject),
        predicate: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        object: namedNode(`${AS}Announce`),
        graph: namedNode(''),
      } as any);

      store.addQuad({
        subject: namedNode(subject),
        predicate: namedNode(`${AS}actor`),
        object: namedNode(fromWebId),
        graph: namedNode(''),
      } as any);

      store.addQuad({
        subject: namedNode(subject),
        predicate: namedNode(`${AS}object`),
        object: literal('friend-request'),
        graph: namedNode(''),
      } as any);

      store.addQuad({
        subject: namedNode(subject),
        predicate: namedNode(`${AS}published`),
        object: literal(new Date().toISOString(), namedNode(`${XSD}dateTime`)),
        graph: namedNode(''),
      } as any);

      // CSS requires an authenticated OIDC request before ACL evaluation.
      // Recipient inbox ACL grants Append to authenticated agents.
      return await this.solidIo.putNew(requestUrl, store);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to send friend request',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async sendAcceptanceNotification(toWebId: string, fromWebId: string): Promise<Result<void>> {
    try {
      const inboxDiscovery = await this.discoverInboxUrl(toWebId);
      if (!inboxDiscovery.ok) {
        return failure(
          appError(
            'NotFound',
            `Could not discover inbox for ${toWebId}`,
            inboxDiscovery.error
          )
        );
      }

      const toInboxUrl = inboxDiscovery.value;
      const notificationId = `friend-accept-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const notificationUrl = `${toInboxUrl}${notificationId}.ttl`;

      const store = new Store();
      const subject = `${notificationUrl}#notification`;

      store.addQuad({
        subject: namedNode(subject),
        predicate: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        object: namedNode(`${AS}Accept`),
        graph: namedNode(''),
      } as any);

      store.addQuad({
        subject: namedNode(subject),
        predicate: namedNode(`${AS}actor`),
        object: namedNode(fromWebId),
        graph: namedNode(''),
      } as any);

      store.addQuad({
        subject: namedNode(subject),
        predicate: namedNode(`${AS}object`),
        object: literal('friend-acceptance'),
        graph: namedNode(''),
      } as any);

      store.addQuad({
        subject: namedNode(subject),
        predicate: namedNode(`${AS}published`),
        object: literal(new Date().toISOString(), namedNode(`${XSD}dateTime`)),
        graph: namedNode(''),
      } as any);

      // CSS rejects anonymous requests with 401 before public Append ACL rules.
      return await this.solidIo.putNew(notificationUrl, store);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to send acceptance notification',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async sendRemoveNotification(toWebId: string, fromWebId: string): Promise<Result<void>> {
    try {
      const inboxDiscovery = await this.discoverInboxUrl(toWebId);
      if (!inboxDiscovery.ok) {
        return failure(
          appError(
            'NotFound',
            `Could not discover inbox for ${toWebId}`,
            inboxDiscovery.error
          )
        );
      }

      const toInboxUrl = inboxDiscovery.value;
      const notificationId = `friend-remove-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const notificationUrl = `${toInboxUrl}${notificationId}.ttl`;

      const store = new Store();
      const subject = `${notificationUrl}#notification`;

      store.addQuad({
        subject: namedNode(subject),
        predicate: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        object: namedNode(`${AS}Remove`),
        graph: namedNode(''),
      } as any);

      store.addQuad({
        subject: namedNode(subject),
        predicate: namedNode(`${AS}actor`),
        object: namedNode(fromWebId),
        graph: namedNode(''),
      } as any);

      store.addQuad({
        subject: namedNode(subject),
        predicate: namedNode(`${AS}object`),
        object: literal('friend-removal'),
        graph: namedNode(''),
      } as any);

      store.addQuad({
        subject: namedNode(subject),
        predicate: namedNode(`${AS}published`),
        object: literal(new Date().toISOString(), namedNode(`${XSD}dateTime`)),
        graph: namedNode(''),
      } as any);

      return await this.solidIo.putNew(notificationUrl, store);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to send remove notification',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  /**
   * Discover inbox URL from WebID document
   * Looks for ldp:inbox or pim:storage predicates
   */
  private async discoverInboxUrl(webId: string): Promise<Result<string>> {
    try {
      const response = await this.solidIo.getHttp().authed(webId, {
        headers: { Accept: 'text/turtle' },
      });

      if (!response.ok) {
        return failure(
          appError('NotFound', `Failed to fetch WebID document: ${response.status}`)
        );
      }

      const text = await response.text();
      const parser = new Parser({ baseIRI: webId });
      const store = new Store();

      await new Promise<void>((resolve, reject) => {
        parser.parse(text, (error: Error | null, quad: any) => {
          if (error) return reject(error);
          if (quad) store.addQuad(quad);
          else resolve();
        });
      });

      const webIdNode = namedNode(webId);

      // Try ldp:inbox first (preferred)
      const ldpInbox = namedNode(`${LDP}inbox`);
      const inboxQuads = store.getQuads(webIdNode as any, ldpInbox as any, null, null);
      if (inboxQuads.length > 0) {
        const inboxUrl = inboxQuads[0].object.value;
        // Ensure trailing slash
        return success(inboxUrl.endsWith('/') ? inboxUrl : `${inboxUrl}/`);
      }

      // Fallback: use pim:storage + /inbox/
      const pimStorage = namedNode(`${PIM}storage`);
      const storageQuads = store.getQuads(webIdNode as any, pimStorage as any, null, null);
      if (storageQuads.length > 0) {
        const storageRoot = storageQuads[0].object.value;
        return success(`${storageRoot}inbox/`);
      }

      // Last fallback: derive from WebID host
      const url = new URL(webId);
      const hostStorage = `${url.protocol}//${url.host}/`;
      
      // Extract username from WebID path if possible
      const pathParts = url.pathname.split('/').filter(p => p);
      if (pathParts.length > 0) {
        const username = pathParts[0];
        return success(`${hostStorage}${username}/inbox/`);
      }

      return success(`${hostStorage}inbox/`);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to discover inbox URL',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async listIncomingRequests(): Promise<Result<FriendRequest[]>> {
    await this.ensureStorageRoot();

    try {
      const inboxUrl = this.getInboxUrl();
      const listResult = await this.solidIo.listContainer(inboxUrl);

      if (!listResult.ok) {
        if (listResult.error.type === 'NotFound') {
          return success([]);
        }
        return failure(listResult.error);
      }

      const requests: FriendRequest[] = [];

      // Read each notification
      for (const notificationUrl of listResult.value) {
        const readResult = await this.solidIo.readTurtle(notificationUrl);
        if (!readResult.ok) continue;

        try {
          // Check if it's acceptance notification and auto-process
          const isAcceptance = this.parseAcceptanceNotification(readResult.value.store, notificationUrl);
          if (isAcceptance) {
            // Write sender's connections.ttl before deleting notification.
            // Failed writes retain notification for a later poll/retry.
            const updateResult = await this.updateConnectionStatus(isAcceptance.actor, 'accepted');
            if (!updateResult.ok) {
              console.warn('Failed to persist accepted connection:', updateResult.error);
              continue;
            }

            const deleteResult = await this.deleteInboxNotification(notificationUrl);
            if (!deleteResult.ok) {
              console.warn('Accepted connection saved but notification cleanup failed:', deleteResult.error);
            }
            continue;
          }

          // Check if it's remove notification and auto-process
          const isRemove = this.parseRemoveNotification(readResult.value.store, notificationUrl);
          if (isRemove) {
            // Remove connection if exists
            const removeResult = await this.removeConnection(isRemove.actor);
            if (!removeResult.ok && removeResult.error.type !== 'NotFound') {
              console.warn('Failed to remove connection:', removeResult.error);
            }

            // Also delete any pending friend request from this actor
            for (const reqUrl of listResult.value) {
              if (reqUrl === notificationUrl) continue;
              const reqRead = await this.solidIo.readTurtle(reqUrl);
              if (!reqRead.ok) continue;
              
              const friendReq = this.parseFriendRequest(reqRead.value.store, reqUrl);
              if (friendReq && friendReq.fromWebId === isRemove.actor) {
                await this.deleteInboxNotification(reqUrl);
                console.log('[SocialRepository] Deleted pending friend request from:', isRemove.actor);
              }
            }

            // Delete removal notification
            const deleteResult = await this.deleteInboxNotification(notificationUrl);
            if (!deleteResult.ok) {
              console.warn('Connection removed but notification cleanup failed:', deleteResult.error);
            }
            continue;
          }

          // Otherwise treat as friend request
          const request = this.parseFriendRequest(readResult.value.store, notificationUrl);
          if (request) requests.push(request);
        } catch (error) {
          console.warn(`Failed to parse notification ${notificationUrl}:`, error);
        }
      }

      return success(requests);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to list incoming requests',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  private parseAcceptanceNotification(store: Store, notificationUrl: string): { actor: string } | null {
    const subject = `${notificationUrl}#notification`;
    const subjectNode = namedNode(subject);

    const getObject = (predicate: string): string | null => {
      const quads = store.getQuads(subjectNode as any, namedNode(predicate) as any, null, null);
      return quads[0]?.object.value ?? null;
    };

    const objectValue = getObject(`${AS}object`);
    if (objectValue !== 'friend-acceptance') {
      return null;
    }

    const actor = getObject(`${AS}actor`);
    return actor ? { actor } : null;
  }

  private parseRemoveNotification(store: Store, notificationUrl: string): { actor: string } | null {
    const subject = `${notificationUrl}#notification`;
    const subjectNode = namedNode(subject);

    const getObject = (predicate: string): string | null => {
      const quads = store.getQuads(subjectNode as any, namedNode(predicate) as any, null, null);
      return quads[0]?.object.value ?? null;
    };

    const objectValue = getObject(`${AS}object`);
    if (objectValue !== 'friend-removal') {
      return null;
    }

    const actor = getObject(`${AS}actor`);
    return actor ? { actor } : null;
  }

  private async updateConnectionStatus(peerWebId: string, status: ConnectionStatus): Promise<Result<void>> {
    const result = await this.getConnection(peerWebId);
    if (result.ok && result.value) {
      const connection = result.value;
      connection.status = status;
      return this.updateConnection(connection);
    }

    if (!result.ok) return failure(result.error);
    return failure(appError('NotFound', 'Outgoing friend connection not found'));
  }

  async listOutgoingRequests(): Promise<Result<FriendRequest[]>> {
    // Outgoing requests are tracked in connections.ttl with status='pending' and direction='outgoing'
    const connectionsResult = await this.listConnections();
    if (!connectionsResult.ok) return failure(connectionsResult.error);

    const outgoing = connectionsResult.value
      .filter(c => c.status === 'pending' && c.direction === 'outgoing')
      .map(c => ({
        id: c.id,
        fromWebId: this._webId ?? '',
        toWebId: c.peerWebId,
        status: 'pending' as const,
        createdAt: c.since,
        schemaVersion: 1,
      }));

    return success(outgoing);
  }

  async deleteInboxNotification(notificationUrl: string): Promise<Result<void>> {
    try {
      return await this.solidIo.deleteResource(notificationUrl);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to delete inbox notification',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  // ========== SHARED ACTIVITIES ==========

  async listSharedActivities(webId: string): Promise<Result<SharedActivity[]>> {
    try {
      const sharedUrl = this.getSharedActivitiesUrl(webId);
      console.log('[SocialRepository] Listing shared activities:', { webId, sharedUrl });
      const listResult = await this.solidIo.listContainer(sharedUrl);

      if (!listResult.ok) {
        console.log('[SocialRepository] Container list failed:', listResult.error);
        if (listResult.error.type === 'NotFound') {
          return success([]);
        }
        return failure(listResult.error);
      }

      console.log('[SocialRepository] Found activity files:', listResult.value);
      const activities: SharedActivity[] = [];

      for (const activityUrl of listResult.value) {
        const readResult = await this.solidIo.readTurtle(activityUrl);
        if (!readResult.ok) {
          console.log('[SocialRepository] Failed to read activity:', activityUrl, readResult.error);
          continue;
        }

        try {
          const activity = this.parseSharedActivity(readResult.value.store, activityUrl);
          console.log('[SocialRepository] Parsed activity:', activity);
          activities.push(activity);
        } catch (error) {
          console.warn(`Failed to parse activity ${activityUrl}:`, error);
        }
      }

      // Sort by date descending
      activities.sort((a, b) => b.date.localeCompare(a.date));

      console.log('[SocialRepository] Total activities loaded:', activities.length);
      return success(activities);
    } catch (error) {
      console.error('[SocialRepository] listSharedActivities error:', error);
      return failure(
        appError(
          'NetworkError',
          'Failed to list shared activities',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async addSharedActivity(activity: SharedActivity): Promise<Result<void>> {
    const validation = validateSharedActivity(activity);
    if (!validation.valid) {
      return failure(appError('ValidationFailed', 'Invalid activity', validation.errors));
    }

    await this.ensureStorageRoot();

    try {
      const sharedUrl = this.getSharedActivitiesUrl();
      
      // Ensure container exists
      const ensureResult = await this.ensureSharedContainerExists(sharedUrl);
      if (!ensureResult.ok) {
        console.warn('[addSharedActivity] Failed to ensure container exists:', ensureResult.error);
        // Continue anyway - might exist but HEAD failed
      }
      
      // Setup ACL for friends to read shared activities
      await this.ensureSharedFolderACL(sharedUrl);
      
      const activityUrl = `${sharedUrl}${activity.id}.ttl`;

      const store = this.serializeSharedActivity(activity, activityUrl);
      return await this.solidIo.putNew(activityUrl, store);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to add shared activity',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  private async ensureSharedFolderACL(containerUrl: string): Promise<void> {
    // Setup ACL to allow authenticated users to read shared activities
    try {
      const aclUrl = `${containerUrl}.acl`;
      
      // Always recreate ACL to ensure it's up to date
      console.log('[SocialRepository] Setting up ACL for shared folder:', aclUrl);
      
      // Create ACL with owner Control + public Read
      const aclStore = new Store();
      
      // Owner authorization (full control)
      const ownerAuth = namedNode(`${aclUrl}#owner`);
      aclStore.addQuad({
        subject: ownerAuth,
        predicate: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        object: namedNode('http://www.w3.org/ns/auth/acl#Authorization')
      } as any);
      
      aclStore.addQuad({
        subject: ownerAuth,
        predicate: namedNode('http://www.w3.org/ns/auth/acl#accessTo'),
        object: namedNode(containerUrl)
      } as any);
      
      aclStore.addQuad({
        subject: ownerAuth,
        predicate: namedNode('http://www.w3.org/ns/auth/acl#default'),
        object: namedNode(containerUrl)
      } as any);
      
      aclStore.addQuad({
        subject: ownerAuth,
        predicate: namedNode('http://www.w3.org/ns/auth/acl#agent'),
        object: namedNode(this._webId!)
      } as any);
      
      aclStore.addQuad({
        subject: ownerAuth,
        predicate: namedNode('http://www.w3.org/ns/auth/acl#mode'),
        object: namedNode('http://www.w3.org/ns/auth/acl#Read')
      } as any);
      
      aclStore.addQuad({
        subject: ownerAuth,
        predicate: namedNode('http://www.w3.org/ns/auth/acl#mode'),
        object: namedNode('http://www.w3.org/ns/auth/acl#Write')
      } as any);
      
      aclStore.addQuad({
        subject: ownerAuth,
        predicate: namedNode('http://www.w3.org/ns/auth/acl#mode'),
        object: namedNode('http://www.w3.org/ns/auth/acl#Control')
      } as any);
      
      // Public Read authorization - allow anyone to read (simpler for testing)
      const publicAuth = namedNode(`${aclUrl}#public`);
      aclStore.addQuad({
        subject: publicAuth,
        predicate: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        object: namedNode('http://www.w3.org/ns/auth/acl#Authorization')
      } as any);
      
      aclStore.addQuad({
        subject: publicAuth,
        predicate: namedNode('http://www.w3.org/ns/auth/acl#accessTo'),
        object: namedNode(containerUrl)
      } as any);
      
      aclStore.addQuad({
        subject: publicAuth,
        predicate: namedNode('http://www.w3.org/ns/auth/acl#default'),
        object: namedNode(containerUrl)
      } as any);
      
      aclStore.addQuad({
        subject: publicAuth,
        predicate: namedNode('http://www.w3.org/ns/auth/acl#agentClass'),
        object: namedNode('http://xmlns.com/foaf/0.1/Agent')
      } as any);
      
      aclStore.addQuad({
        subject: publicAuth,
        predicate: namedNode('http://www.w3.org/ns/auth/acl#mode'),
        object: namedNode('http://www.w3.org/ns/auth/acl#Read')
      } as any);
      
      // Try to read existing ACL first for putReplace
      const existing = await this.solidIo.readTurtle(aclUrl);
      const result = existing.ok && existing.value.etag 
        ? await this.solidIo.putReplace(aclUrl, aclStore, existing.value.etag)
        : await this.solidIo.putNew(aclUrl, aclStore);
      
      if (result.ok) {
        console.log('[SocialRepository] ACL created/updated for shared folder');
      } else {
        console.warn('[SocialRepository] Failed to create/update ACL:', result.error);
      }
    } catch (error) {
      console.warn('[SocialRepository] Error setting up ACL:', error);
      // Don't fail the whole operation if ACL setup fails
    }
  }

  private async ensureSharedContainerExists(containerUrl: string): Promise<Result<void>> {
    try {
      const response = await this.solidIo.getHttp().authed(containerUrl, {
        method: 'HEAD',
      });

      if (response.ok) {
        return success(undefined);
      }

      if (response.status === 404) {
        // Create container
        const createResponse = await this.solidIo.getHttp().authed(containerUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'text/turtle',
            'Link': '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
          },
          body: '',
        });

        if (!createResponse.ok) {
          return failure(
            appError('NetworkError', `Failed to create shared container: ${createResponse.status}`)
          );
        }

        return success(undefined);
      }

      return failure(
        appError('NetworkError', `Unexpected response: ${response.status}`)
      );
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to ensure shared container exists',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  // ========== SERIALIZATION ==========

  private serializeConnection(store: Store, connection: Connection, subjectUri: string): void {
    const subject = namedNode(subjectUri);

    store.addQuad({
      subject,
      predicate: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      object: namedNode(`${FP}Connection`),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject,
      predicate: namedNode(`${FP}peerWebId`),
      object: namedNode(connection.peerWebId),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject,
      predicate: namedNode(`${FP}status`),
      object: literal(connection.status),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject,
      predicate: namedNode(`${FP}direction`),
      object: literal(connection.direction),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject,
      predicate: namedNode(`${FP}since`),
      object: literal(connection.since, namedNode(`${XSD}date`)),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject,
      predicate: namedNode(`${FP}schemaVersion`),
      object: literal(String(connection.schemaVersion), namedNode(`${XSD}integer`)),
      graph: namedNode(''),
    } as any);
  }

  private parseConnection(store: Store, subjectUri: string): Connection {
    const subject = namedNode(subjectUri);

    const getObject = (predicate: string): string | null => {
      const quads = store.getQuads(subject as any, namedNode(predicate) as any, null, null);
      return quads[0]?.object.value ?? null;
    };

    const peerWebId = getObject(`${FP}peerWebId`) ?? '';
    const status = (getObject(`${FP}status`) ?? 'pending') as ConnectionStatus;
    const direction = (getObject(`${FP}direction`) ?? 'outgoing') as 'outgoing' | 'incoming';
    const since = getObject(`${FP}since`) ?? new Date().toISOString().split('T')[0]!;
    const schemaVersion = parseInt(getObject(`${FP}schemaVersion`) ?? '1', 10);

    return {
      id: peerWebId,
      peerWebId,
      status,
      direction,
      since,
      schemaVersion,
    };
  }

  private parseFriendRequest(store: Store, notificationUrl: string): FriendRequest | null {
    const subject = `${notificationUrl}#notification`;
    const subjectNode = namedNode(subject);

    const getObject = (predicate: string): string | null => {
      const quads = store.getQuads(subjectNode as any, namedNode(predicate) as any, null, null);
      return quads[0]?.object.value ?? null;
    };

    const objectValue = getObject(`${AS}object`);
    if (objectValue !== 'friend-request') {
      console.log('[parseFriendRequest] Not a friend-request notification:', objectValue);
      return null;
    }

    const actor = getObject(`${AS}actor`);
    const published = getObject(`${AS}published`);

    console.log('[parseFriendRequest] Parsed:', { 
      notificationUrl, 
      actor, 
      published,
      toWebId: this._webId 
    });

    if (!actor) {
      console.warn('[parseFriendRequest] No actor found');
      return null;
    }

    return {
      id: notificationUrl,
      fromWebId: actor,
      toWebId: this._webId ?? '',
      status: 'pending',
      createdAt: published ?? new Date().toISOString(),
      schemaVersion: 1,
    };
  }

  private serializeSharedActivity(activity: SharedActivity, activityUrl: string): Store {
    const store = new Store();
    const subject = `${activityUrl}#activity`;

    store.addQuad({
      subject: namedNode(subject),
      predicate: namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      object: namedNode(`${FP}SharedActivity`),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(subject),
      predicate: namedNode(`${FP}authorWebId`),
      object: namedNode(activity.authorWebId),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(subject),
      predicate: namedNode(`${FP}date`),
      object: literal(activity.date, namedNode(`${XSD}date`)),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(subject),
      predicate: namedNode(`${FP}title`),
      object: literal(activity.title),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(subject),
      predicate: namedNode(`${FP}durationMin`),
      object: literal(String(activity.durationMin), namedNode(`${XSD}integer`)),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(subject),
      predicate: namedNode(`${FP}totalVolumeKg`),
      object: literal(String(activity.totalVolumeKg), namedNode(`${XSD}decimal`)),
      graph: namedNode(''),
    } as any);

    activity.exerciseNames.forEach(name => {
      store.addQuad({
        subject: namedNode(subject),
        predicate: namedNode(`${FP}exerciseName`),
        object: literal(name),
        graph: namedNode(''),
      } as any);
    });

    store.addQuad({
      subject: namedNode(subject),
      predicate: namedNode(`${FP}visibility`),
      object: literal(activity.visibility),
      graph: namedNode(''),
    } as any);

    store.addQuad({
      subject: namedNode(subject),
      predicate: namedNode(`${FP}schemaVersion`),
      object: literal(String(activity.schemaVersion), namedNode(`${XSD}integer`)),
      graph: namedNode(''),
    } as any);

    return store;
  }

  private parseSharedActivity(store: Store, activityUrl: string): SharedActivity {
    const subject = `${activityUrl}#activity`;
    const subjectNode = namedNode(subject);

    const getObject = (predicate: string): string | null => {
      const quads = store.getQuads(subjectNode as any, namedNode(predicate) as any, null, null);
      return quads[0]?.object.value ?? null;
    };

    const getObjects = (predicate: string): string[] => {
      const quads = store.getQuads(subjectNode as any, namedNode(predicate) as any, null, null);
      return quads.map(q => q.object.value);
    };

    const id = activityUrl.split('/').pop()?.replace('.ttl', '') ?? '';
    const authorWebId = getObject(`${FP}authorWebId`) ?? '';
    const date = getObject(`${FP}date`) ?? '';
    const title = getObject(`${FP}title`) ?? '';
    const durationMin = parseInt(getObject(`${FP}durationMin`) ?? '0', 10);
    const totalVolumeKg = parseFloat(getObject(`${FP}totalVolumeKg`) ?? '0');
    const exerciseNames = getObjects(`${FP}exerciseName`);
    const visibility = (getObject(`${FP}visibility`) ?? 'friends') as 'friends' | 'public';
    const schemaVersion = parseInt(getObject(`${FP}schemaVersion`) ?? '1', 10);

    return {
      id,
      authorWebId,
      date,
      title,
      durationMin,
      totalVolumeKg,
      exerciseNames,
      visibility,
      schemaVersion,
    };
  }

  private encodeId(webId: string): string {
    return encodeURIComponent(webId).replace(/%/g, '_');
  }

  private removeQuadsForSubject(store: Store, subjectUri: string): Store {
    const newStore = new Store();
    const allQuads = store.getQuads(null, null, null, null);
    const quadsToRemove = store.getQuads(namedNode(subjectUri) as any, null, null, null);
    
    for (const quad of allQuads) {
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
}

export const createSocialRepository = (config: SocialRepositoryConfig): SocialRepository => {
  return new SocialRepositoryImpl(config);
};
