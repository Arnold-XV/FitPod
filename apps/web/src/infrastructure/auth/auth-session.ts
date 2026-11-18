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
    // Use static redirect URL as recommended by Inrupt documentation
    // Avoid dynamic URLs that change with routes or query parameters
    const redirectUrl = new URL('/', window.location.href).toString();

    console.log('[Auth] Logging in with:', { oidcIssuer, redirectUrl });

    // For localhost development, omit clientId to use dynamic client registration
    // This avoids the issue where OIDC providers cannot fetch localhost client documents
    await solidLogin({
      oidcIssuer,
      redirectUrl,
      clientName: 'FitPod Local Development',
      tokenType: 'DPoP',
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
