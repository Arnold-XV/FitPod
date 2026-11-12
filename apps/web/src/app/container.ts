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

// Use cases
import { createLoginUseCase } from '@/application/auth/login';
import { createLogoutUseCase } from '@/application/auth/logout';
import { createAddMeasurementUseCase } from '@/application/body/add-measurement';
import { createListMeasurementsUseCase } from '@/application/body/list-measurements';

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

  get bodyRepository(): BodyRepository {
    if (!this._bodyRepository) {
      // Get storage root from WebID
      const webId = this.authSession.webId;
      if (!webId) {
        throw new Error('Not authenticated - cannot create body repository');
      }

      // Extract storage root from WebID
      // For testing: https://arnold.solidcommunity.net/profile/card#me
      // Storage root: https://arnold.solidcommunity.net/
      const url = new URL(webId);
      const storageRoot = `${url.protocol}//${url.host}/`;

      this._bodyRepository = createBodyRepository({
        solidIo: this.solidIo,
        storageRoot,
      });
    }
    return this._bodyRepository;
  }

  // Use Cases
  get loginUseCase() {
    return createLoginUseCase({
      authSession: this.authSession,
      logger: this.logger,
    });
  }

  get logoutUseCase() {
    return createLogoutUseCase({
      authSession: this.authSession,
      logger: this.logger,
    });
  }

  get addMeasurementUseCase() {
    return createAddMeasurementUseCase({
      bodyRepository: this.bodyRepository,
      clock: this.clock,
      idGenerator: this.idGenerator,
      logger: this.logger,
    });
  }

  get listMeasurementsUseCase() {
    return createListMeasurementsUseCase({
      bodyRepository: this.bodyRepository,
      logger: this.logger,
    });
  }

  /**
   * Reset repositories when user changes
   * Called after login/logout
   */
  resetRepositories(): void {
    this._bodyRepository = undefined;
    this._solidIo = undefined;
    this._podHttp = undefined;
  }
}

// Global singleton
export const container = new AppContainer();
