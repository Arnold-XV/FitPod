import { Session } from '@inrupt/solid-client-authn-node';

export interface ClientCredentials {
  clientId: string;
  clientSecret: string;
  oidcIssuer: string;
}

export async function loginWithClientCredentials(
  credentials: ClientCredentials
): Promise<Session> {
  const session = new Session();
  
  await session.login({
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    oidcIssuer: credentials.oidcIssuer,
  });

  if (!session.info.isLoggedIn) {
    throw new Error(`Login failed for issuer ${credentials.oidcIssuer}`);
  }

  console.log(`Authenticated as ${session.info.webId}`);
  return session;
}

export function loadCredentialsFromEnv(): ClientCredentials {
  const clientId = process.env.SOLID_CLIENT_ID;
  const clientSecret = process.env.SOLID_CLIENT_SECRET;
  const oidcIssuer = process.env.SOLID_OIDC_ISSUER || 'http://localhost:3001';

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing credentials. Set SOLID_CLIENT_ID and SOLID_CLIENT_SECRET env vars.\n' +
      'Generate at: http://localhost:3001/.account/'
    );
  }

  return { clientId, clientSecret, oidcIssuer };
}
