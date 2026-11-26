/**
 * Dependency Injection Container (Composition Root)
 * SAD 4: app/ merangkai semuanya lewat DI
 */

import { createAuthSession, type AuthSession } from '@/infrastructure/auth/auth-session';
import { createPodHttp, type PodHttp } from '@/infrastructure/http/pod-http';
import { createLogger } from '@/infrastructure/logging/console-logger';
import type { Logger } from '@/domain/shared/logger';
import { createClock } from '@/infrastructure/clock/system-clock';
import { createIdGenerator } from '@/infrastructure/id-gen/uuid-generator';
import { createSolidIo, type SolidIo } from '@/data/solid/solid-io';
import { createBodyRepository } from '@/data/repositories/body/body-repository';
import type { BodyRepository } from '@/domain/body/ports';
import { createSocialRepository } from '@/data/repositories/social/social-repository';
import type { SocialRepository } from '@/domain/social/ports';
import { createAclManager } from '@/data/acl/acl-manager';
import type { AclManager } from '@/data/acl/acl-manager';
import { createWorkoutRepository, type WorkoutRepository } from '@/data/repositories/workout/workout-repository';
import { createAccessRepository } from '@/data/repositories/access/access-repository';
import { createProfessionalService } from '@/data/repositories/professional/professional-service';
import { createClientRegistry, type ClientRegistry } from '@/data/repositories/professional/client-registry';
import { createParQRepository } from '@/data/repositories/health/parq-repository';
import { createRecommendationRepository } from '@/data/repositories/professional/recommendation-repository';
import { createClientRecommendationService } from '@/data/repositories/client/client-recommendation-service';
import type { AccessRepository } from '@/domain/access/ports';
import type { ProfessionalService, RecommendationRepository, ClientRecommendationService } from '@/domain/professional/ports';
import type { ParQRepository } from '@/domain/health/ports';

// Use cases
import { createLoginUseCase } from '@/application/auth/login';
import { createLogoutUseCase } from '@/application/auth/logout';
import { createAddMeasurementUseCase } from '@/application/body/add-measurement';
import { createListMeasurementsUseCase } from '@/application/body/list-measurements';
import { createSendFriendRequestUseCase } from '@/application/social/send-friend-request';
import { createAcceptFriendRequestUseCase } from '@/application/social/accept-friend-request';
import { createRejectFriendRequestUseCase } from '@/application/social/reject-friend-request';
import { createListConnectionsUseCase } from '@/application/social/list-connections';
import { createListIncomingRequestsUseCase } from '@/application/social/list-incoming-requests';
import { createGetSocialFeedUseCase } from '@/application/social/get-social-feed';
import { createSetupInboxUseCase } from '@/application/social/setup-inbox';
import { createGrantAccessUseCase } from '@/application/access/grant-access';
import { createListGrantsUseCase } from '@/application/access/list-grants';
import { createRevokeAccessUseCase } from '@/application/access/revoke-access';
import { createListClientsUseCase } from '@/application/professional/list-clients';
import { createGetClientSummaryUseCase } from '@/application/professional/get-client-summary';
import { createRegisterClientUseCase } from '@/application/professional/register-client';
import { createSaveParQResponseUseCase } from '@/application/health/save-parq-response';
import { createCreateRecommendationUseCase } from '@/application/professional/create-recommendation';
import { createApplyRecommendationUseCase } from '@/application/client/apply-recommendation';

import type { Clock } from '@/domain/shared/clock';
import type { IdGenerator } from '@/domain/shared/id-generator';

/**
 * Application Container
 * Implements Dependency Injection pattern
 */
export class AppContainer {
  // Infrastructure (L5)
  private _authSession?: AuthSession;
  private _podHttp?: PodHttp;
  private _logger?: Logger;
  private _clock?: Clock;
  private _idGenerator?: IdGenerator;

  // Data (L4)
  private _solidIo?: SolidIo;
  private _bodyRepository?: BodyRepository;
  private _socialRepository?: SocialRepository;
  private _aclManager?: AclManager;
  private _workoutRepository?: WorkoutRepository;

  async getWorkoutRepository(): Promise<WorkoutRepository> {
    if (!this._workoutRepository) {
      const webId = this.authSession.webId;
      if (!webId) throw new Error('Not authenticated - cannot create workout repository');
      this._workoutRepository = createWorkoutRepository(this.solidIo, webId);
    }
    return this._workoutRepository;
  }
  private _accessRepository?: AccessRepository;
  private _professionalService?: ProfessionalService;
  private _clientRegistry?: ClientRegistry;
  private _parqRepository?: ParQRepository;
  private _recommendationRepository?: RecommendationRepository;
  private _clientRecommendationService?: ClientRecommendationService;

  // Lazy initialization
  get authSession(): AuthSession {
    if (!this._authSession) {
      this._authSession = createAuthSession();
    }
    return this._authSession;
  }

  get logger(): Logger {
    if (!this._logger) {
      this._logger = createLogger('debug');
    }
    return this._logger;
  }

  get clock(): Clock {
    if (!this._clock) {
      this._clock = createClock();
    }
    return this._clock;
  }

  get idGenerator(): IdGenerator {
    if (!this._idGenerator) {
      this._idGenerator = createIdGenerator();
    }
    return this._idGenerator;
  }

  get podHttp(): PodHttp {
    if (!this._podHttp) {
      this._podHttp = createPodHttp({
        authedFetch: this.authSession.fetch,
        concurrencyLimit: 6,
        timeout: 5000,
        retryEnabled: true,
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 2000,
      });
    }
    return this._podHttp;
  }

  get solidIo(): SolidIo {
    if (!this._solidIo) {
      this._solidIo = createSolidIo(this.podHttp);
    }
    return this._solidIo;
  }

  async getAclManager(): Promise<AclManager> {
    if (!this._aclManager) {
      const webId = this.authSession.webId;
      if (!webId) {
        throw new Error('Not authenticated - cannot create ACL manager');
      }

      this._aclManager = createAclManager({
        podHttp: this.podHttp,
        ownerWebId: webId,
        logger: this.logger,
      });
    }
    return this._aclManager;
  }

  /**
   * Get the body repository, initializing storage root via pim:storage discovery.
   * AR-19: Storage root discovered from WebID document on first access.
   */
  async getBodyRepository(): Promise<BodyRepository> {
    if (!this._bodyRepository) {
      const webId = this.authSession.webId;
      if (!webId) {
        throw new Error('Not authenticated - cannot create body repository');
      }

      this._bodyRepository = createBodyRepository({
        solidIo: this.solidIo,
        storageRoot: '', // Will be discovered via pim:storage
      });

      // Set WebID for storage root discovery
      this._bodyRepository.setWebId(webId);

      // Ensure storage root is discovered before any operations
      await this._bodyRepository.ensureStorageRoot();
    }
    return this._bodyRepository;
  }

  /**
   * Refresh the body repository (e.g., after logout/login with different WebID)
   */
  async refreshBodyRepository(): Promise<BodyRepository> {
    this._bodyRepository = undefined;
    this._solidIo = undefined;
    return this.getBodyRepository();
  }

  /**
   * Get the social repository, initializing storage root via pim:storage discovery.
   */
  async getSocialRepository(): Promise<SocialRepository> {
    if (!this._socialRepository) {
      const webId = this.authSession.webId;
      if (!webId) {
        throw new Error('Not authenticated - cannot create social repository');
      }

      this._socialRepository = createSocialRepository({
        solidIo: this.solidIo,
        storageRoot: '',
      });
      this._socialRepository.setWebId(webId);
      await this._socialRepository.ensureStorageRoot();
    }
    return this._socialRepository;
  }

  async getAccessRepository(): Promise<AccessRepository> {
    if (!this._accessRepository) {
      const webId = this.authSession.webId;
      if (!webId) {
        throw new Error('Not authenticated - cannot create access repository');
      }

      this._accessRepository = createAccessRepository({
        solidIo: this.solidIo,
        storageRoot: '',
      });

      this._accessRepository.setWebId(webId);
      await this._accessRepository.ensureStorageRoot();
    }
    return this._accessRepository;
  }

  async getProfessionalService(): Promise<ProfessionalService> {
    if (!this._professionalService) {
      const webId = this.authSession.webId;
      if (!webId) {
        throw new Error('Not authenticated - cannot create professional service');
      }

      this._professionalService = createProfessionalService({
        solidIo: this.solidIo,
      });

      this._professionalService.setWebId(webId);
    }
    return this._professionalService;
  }

  async getClientRegistry(): Promise<ClientRegistry> {
    if (!this._clientRegistry) {
      const webId = this.authSession.webId;
      if (!webId) {
        throw new Error('Not authenticated - cannot create client registry');
      }

      const url = new URL(webId);
      const storageRoot = `${url.protocol}//${url.host}/`;

      this._clientRegistry = createClientRegistry(this.solidIo, storageRoot);
    }
    return this._clientRegistry;
  }

  async getParQRepository(): Promise<ParQRepository> {
    if (!this._parqRepository) {
      const webId = this.authSession.webId;
      if (!webId) {
        throw new Error('Not authenticated - cannot create PAR-Q repository');
      }

      this._parqRepository = createParQRepository({
        solidIo: this.solidIo,
        storageRoot: '',
      });

      this._parqRepository.setWebId(webId);
      await this._parqRepository.ensureStorageRoot();
    }
    return this._parqRepository;
  }

  async getRecommendationRepository(): Promise<RecommendationRepository> {
    if (!this._recommendationRepository) {
      const webId = this.authSession.webId;
      if (!webId) {
        throw new Error('Not authenticated - cannot create recommendation repository');
      }

      this._recommendationRepository = createRecommendationRepository({
        solidIo: this.solidIo,
        storageRoot: '',
      });

      this._recommendationRepository.setWebId(webId);
      await this._recommendationRepository.ensureStorageRoot();
    }
    return this._recommendationRepository;
  }

  async getClientRecommendationService(): Promise<ClientRecommendationService> {
    if (!this._clientRecommendationService) {
      const webId = this.authSession.webId;
      if (!webId) {
        throw new Error('Not authenticated - cannot create client recommendation service');
      }

      this._clientRecommendationService = createClientRecommendationService({
        solidIo: this.solidIo,
      });

      this._clientRecommendationService.setWebId(webId);
    }
    return this._clientRecommendationService;
  }

  // Use Cases (cached after first access)
  private _loginUseCase?: ReturnType<typeof createLoginUseCase>;
  private _logoutUseCase?: ReturnType<typeof createLogoutUseCase>;
  private _addMeasurementUseCase?: ReturnType<typeof createAddMeasurementUseCase>;
  private _listMeasurementsUseCase?: ReturnType<typeof createListMeasurementsUseCase>;
  private _sendFriendRequestUseCase?: ReturnType<typeof createSendFriendRequestUseCase>;
  private _acceptFriendRequestUseCase?: ReturnType<typeof createAcceptFriendRequestUseCase>;
  private _rejectFriendRequestUseCase?: ReturnType<typeof createRejectFriendRequestUseCase>;
  private _listConnectionsUseCase?: ReturnType<typeof createListConnectionsUseCase>;
  private _listIncomingRequestsUseCase?: ReturnType<typeof createListIncomingRequestsUseCase>;
  private _getSocialFeedUseCase?: ReturnType<typeof createGetSocialFeedUseCase>;
  private _setupInboxUseCase?: ReturnType<typeof createSetupInboxUseCase>;
  private _grantAccessUseCase?: ReturnType<typeof createGrantAccessUseCase>;
  private _listGrantsUseCase?: ReturnType<typeof createListGrantsUseCase>;
  private _revokeAccessUseCase?: ReturnType<typeof createRevokeAccessUseCase>;
  private _listClientsUseCase?: ReturnType<typeof createListClientsUseCase>;
  private _getClientSummaryUseCase?: ReturnType<typeof createGetClientSummaryUseCase>;
  private _registerClientUseCase?: ReturnType<typeof createRegisterClientUseCase>;
  private _saveParQResponseUseCase?: ReturnType<typeof createSaveParQResponseUseCase>;
  private _createRecommendationUseCase?: ReturnType<typeof createCreateRecommendationUseCase>;
  private _applyRecommendationUseCase?: ReturnType<typeof createApplyRecommendationUseCase>;

  async getLoginUseCase(): Promise<ReturnType<typeof createLoginUseCase>> {
    if (!this._loginUseCase) {
      this._loginUseCase = createLoginUseCase({
        authSession: this.authSession,
        logger: this.logger,
      });
    }
    return this._loginUseCase;
  }

  async getLogoutUseCase(): Promise<ReturnType<typeof createLogoutUseCase>> {
    if (!this._logoutUseCase) {
      this._logoutUseCase = createLogoutUseCase({
        authSession: this.authSession,
        logger: this.logger,
      });
    }
    return this._logoutUseCase;
  }

  async getAddMeasurementUseCase(): Promise<ReturnType<typeof createAddMeasurementUseCase>> {
    if (!this._addMeasurementUseCase) {
      const bodyRepository = await this.getBodyRepository();
      this._addMeasurementUseCase = createAddMeasurementUseCase({
        bodyRepository,
        clock: this.clock,
        idGenerator: this.idGenerator,
        logger: this.logger,
      });
    }
    return this._addMeasurementUseCase;
  }

  async getListMeasurementsUseCase(): Promise<ReturnType<typeof createListMeasurementsUseCase>> {
    if (!this._listMeasurementsUseCase) {
      const bodyRepository = await this.getBodyRepository();
      this._listMeasurementsUseCase = createListMeasurementsUseCase({
        bodyRepository,
        logger: this.logger,
      });
    }
    return this._listMeasurementsUseCase;
  }

  async getSendFriendRequestUseCase(): Promise<ReturnType<typeof createSendFriendRequestUseCase>> {
    if (!this._sendFriendRequestUseCase) {
      const socialRepository = await this.getSocialRepository();
      const webId = this.authSession.webId;
      if (!webId) throw new Error('Not authenticated');

      this._sendFriendRequestUseCase = createSendFriendRequestUseCase({
        socialRepository,
        logger: this.logger,
        clock: this.clock,
        currentWebId: webId,
      });
    }
    return this._sendFriendRequestUseCase;
  }

  async getAcceptFriendRequestUseCase(): Promise<ReturnType<typeof createAcceptFriendRequestUseCase>> {
    if (!this._acceptFriendRequestUseCase) {
      const socialRepository = await this.getSocialRepository();
      const aclManager = await this.getAclManager();
      const webId = this.authSession.webId;
      if (!webId) throw new Error('Not authenticated');

      this._acceptFriendRequestUseCase = createAcceptFriendRequestUseCase({
        socialRepository,
        aclManager,
        logger: this.logger,
        clock: this.clock,
        currentWebId: webId,
      });
    }
    return this._acceptFriendRequestUseCase;
  }

  async getRejectFriendRequestUseCase(): Promise<ReturnType<typeof createRejectFriendRequestUseCase>> {
    if (!this._rejectFriendRequestUseCase) {
      const socialRepository = await this.getSocialRepository();
      this._rejectFriendRequestUseCase = createRejectFriendRequestUseCase({
        socialRepository,
        logger: this.logger,
      });
    }
    return this._rejectFriendRequestUseCase;
  }

  async getListConnectionsUseCase(): Promise<ReturnType<typeof createListConnectionsUseCase>> {
    if (!this._listConnectionsUseCase) {
      const socialRepository = await this.getSocialRepository();
      this._listConnectionsUseCase = createListConnectionsUseCase({
        socialRepository,
        logger: this.logger,
      });
    }
    return this._listConnectionsUseCase;
  }

  async getListIncomingRequestsUseCase(): Promise<ReturnType<typeof createListIncomingRequestsUseCase>> {
    if (!this._listIncomingRequestsUseCase) {
      const socialRepository = await this.getSocialRepository();
      this._listIncomingRequestsUseCase = createListIncomingRequestsUseCase({
        socialRepository,
        logger: this.logger,
      });
    }
    return this._listIncomingRequestsUseCase;
  }

  async GetSocialFeedUseCase(): Promise<ReturnType<typeof createGetSocialFeedUseCase>> {
    if (!this._getSocialFeedUseCase) {
      const socialRepository = await this.getSocialRepository();
      this._getSocialFeedUseCase = createGetSocialFeedUseCase({
        socialRepository,
        logger: this.logger,
      });
    }
    return this._getSocialFeedUseCase;
  }

  async getSetupInboxUseCase(): Promise<ReturnType<typeof createSetupInboxUseCase>> {
    if (!this._setupInboxUseCase) {
      const aclManager = await this.getAclManager();
      this._setupInboxUseCase = createSetupInboxUseCase({
        aclManager,
        logger: this.logger,
      });
    }
    return this._setupInboxUseCase;
  }
  async getGrantAccessUseCase(): Promise<ReturnType<typeof createGrantAccessUseCase>> {
    if (!this._grantAccessUseCase) {
      const accessRepository = await this.getAccessRepository();
      const webId = this.authSession.webId;
      if (!webId) throw new Error('Not authenticated');
      
      this._grantAccessUseCase = createGrantAccessUseCase({
        accessRepository,
        clock: this.clock,
        idGenerator: this.idGenerator,
        logger: this.logger,
        currentWebId: webId,
      });
    }
    return this._grantAccessUseCase;
  }

  async getListGrantsUseCase(): Promise<ReturnType<typeof createListGrantsUseCase>> {
    if (!this._listGrantsUseCase) {
      const accessRepository = await this.getAccessRepository();
      this._listGrantsUseCase = createListGrantsUseCase({
        accessRepository,
        logger: this.logger,
      });
    }
    return this._listGrantsUseCase;
  }

  async getRevokeAccessUseCase(): Promise<ReturnType<typeof createRevokeAccessUseCase>> {
    if (!this._revokeAccessUseCase) {
      const accessRepository = await this.getAccessRepository();
      this._revokeAccessUseCase = createRevokeAccessUseCase({
        accessRepository,
        logger: this.logger,
      });
    }
    return this._revokeAccessUseCase;
  }

  async getListClientsUseCase(): Promise<ReturnType<typeof createListClientsUseCase>> {
    if (!this._listClientsUseCase) {
      const professionalService = await this.getProfessionalService();
      this._listClientsUseCase = createListClientsUseCase({
        professionalService,
        logger: this.logger,
      });
    }
    return this._listClientsUseCase;
  }

  async getGetClientSummaryUseCase(): Promise<ReturnType<typeof createGetClientSummaryUseCase>> {
    if (!this._getClientSummaryUseCase) {
      const professionalService = await this.getProfessionalService();
      this._getClientSummaryUseCase = createGetClientSummaryUseCase({
        professionalService,
        logger: this.logger,
      });
    }
    return this._getClientSummaryUseCase;
  }

  async getRegisterClientUseCase(): Promise<ReturnType<typeof createRegisterClientUseCase>> {
    if (!this._registerClientUseCase) {
      const clientRegistry = await this.getClientRegistry();
      this._registerClientUseCase = createRegisterClientUseCase({
        clientRegistry,
        logger: this.logger,
      });
    }
    return this._registerClientUseCase;
  }

  async getSaveParQResponseUseCase(): Promise<ReturnType<typeof createSaveParQResponseUseCase>> {
    if (!this._saveParQResponseUseCase) {
      const parqRepository = await this.getParQRepository();
      this._saveParQResponseUseCase = createSaveParQResponseUseCase({
        parqRepository,
        clock: this.clock,
        idGenerator: this.idGenerator,
        logger: this.logger,
      });
    }
    return this._saveParQResponseUseCase;
  }

  async getCreateRecommendationUseCase(): Promise<ReturnType<typeof createCreateRecommendationUseCase>> {
    if (!this._createRecommendationUseCase) {
      const recommendationRepository = await this.getRecommendationRepository();
      const webId = this.authSession.webId;
      if (!webId) throw new Error('Not authenticated');

      this._createRecommendationUseCase = createCreateRecommendationUseCase({
        recommendationRepository,
        clock: this.clock,
        idGenerator: this.idGenerator,
        logger: this.logger,
        currentWebId: webId,
      });
    }
    return this._createRecommendationUseCase;
  }

  async getApplyRecommendationUseCase(): Promise<ReturnType<typeof createApplyRecommendationUseCase>> {
    if (!this._applyRecommendationUseCase) {
      const clientRecommendationService = await this.getClientRecommendationService();
      this._applyRecommendationUseCase = createApplyRecommendationUseCase({
        clientRecommendationService,
        logger: this.logger,
      });
    }
    return this._applyRecommendationUseCase;
  }

  async getListReceivedRecommendationsUseCase() {
    const service = await this.getClientRecommendationService();
    return () => service.listReceivedRecommendations();
  }

  async getRejectRecommendationUseCase() {
    const service = await this.getClientRecommendationService();
    return (input: { recommendationId: string; professionalWebId: string }) => 
      service.rejectRecommendation(input.recommendationId, input.professionalWebId);
  }

  /**
   * Reset repositories when user changes
   * Called after logout
   */
  async resetRepositories(): Promise<void> {
    this._bodyRepository = undefined;
    this._socialRepository = undefined;
    this._aclManager = undefined;
    this._accessRepository = undefined;
    this._professionalService = undefined;
    this._clientRegistry = undefined;
    this._parqRepository = undefined;
    this._recommendationRepository = undefined;
    this._clientRecommendationService = undefined;
    this._solidIo = undefined;
    this._loginUseCase = undefined;
    this._logoutUseCase = undefined;
    this._addMeasurementUseCase = undefined;
    this._listMeasurementsUseCase = undefined;
    this._sendFriendRequestUseCase = undefined;
    this._acceptFriendRequestUseCase = undefined;
    this._rejectFriendRequestUseCase = undefined;
    this._listConnectionsUseCase = undefined;
    this._listIncomingRequestsUseCase = undefined;
    this._getSocialFeedUseCase = undefined;
    this._setupInboxUseCase = undefined;
    this._grantAccessUseCase = undefined;
    this._listGrantsUseCase = undefined;
    this._revokeAccessUseCase = undefined;
    this._listClientsUseCase = undefined;
    this._getClientSummaryUseCase = undefined;
    this._registerClientUseCase = undefined;
    this._saveParQResponseUseCase = undefined;
    this._createRecommendationUseCase = undefined;
    this._applyRecommendationUseCase = undefined;
  }
}

// Global singleton
export const container = new AppContainer();
