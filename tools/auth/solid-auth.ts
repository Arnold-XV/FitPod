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

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(): void {
  for (const file of ['.env.local', '.env']) {
    const fullPath = resolve(process.cwd(), file);
    if (existsSync(fullPath)) {
      try {
        const content = readFileSync(fullPath, 'utf8');
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }
}

loadEnvFile();

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
