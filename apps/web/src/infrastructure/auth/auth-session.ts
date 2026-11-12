/**
 * Auth Session wrapper for Solid-OIDC
 * L5 Infrastructure - AR-02: Only this file imports Solid auth library
 * Based on SAD 4.4 contract
 */

import {
  login as solidLogin,
  handleIncomingRedirect,
  getDefaultSession,
  logout as solidLogout,
  Session,
} from '@inrupt/solid-client-authn-browser';

export interface AuthSession {
  restore(): Promise<{ webId: string } | null>;
  login(oidcIssuer: string): Promise<void>;
  logout(): Promise<void>;
  readonly webId: string | null;
  readonly fetch: typeof fetch;
}

class SolidAuthSession implements AuthSession {
  private session: Session;

  constructor() {
    this.session = getDefaultSession();
  }

  async restore(): Promise<{ webId: string } | null> {
    try {
      const info = await handleIncomingRedirect({
        restorePreviousSession: true,
      });

      if (info?.isLoggedIn && info.webId) {
        console.log('[Auth] Session restored:', info.webId);
        return { webId: info.webId };
      }

      return null;
    } catch (error) {
      console.error('[Auth] Failed to restore session:', error);
      return null;
    }
  }

  async login(oidcIssuer: string): Promise<void> {
    const clientId = window.location.origin + '/client-id.jsonld';
    const redirectUrl = window.location.href;

    console.log('[Auth] Logging in with:', { oidcIssuer, clientId, redirectUrl });

    await solidLogin({
      oidcIssuer,
      redirectUrl,
      clientId,
      clientName: 'FitPod Test Client',
      tokenType: 'DPoP', // SAD 4.3: DPoP tokens
    });
  }

  async logout(): Promise<void> {
    await solidLogout();
    console.log('[Auth] Logged out');
  }

  get webId(): string | null {
    return this.session.info.webId ?? null;
  }

  get fetch(): typeof fetch {
    return this.session.fetch;
  }
}

export const createAuthSession = (): AuthSession => {
  return new SolidAuthSession();
};
