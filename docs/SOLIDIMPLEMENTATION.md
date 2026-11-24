# Solid Pod Integration Implementation Plan

**Status:** Planning
**Created:** 2026-11-18
**Last Updated:** 2026-11-18

## Executive Summary

Plan to extend FitPod's Solid Pod integration with server-side authentication using Client Credentials flow. Enables automated scripts, testing, seeding, and CI/CD workflows while maintaining existing browser-based OIDC authentication.

## Current State

### What's Implemented

**Browser Authentication (L5 Infrastructure)**
- Package: `@inrupt/solid-client-authn-browser` (v5.0.3)
- Location: `apps/web/src/infrastructure/auth/`
- Flow: Interactive OIDC with DPoP tokens
- Session restoration: Yes
- Client ID document: `/client-id.jsonld` (template-based)

**Data Layer (L4)**
- RDF read/write via N3.js
- Turtle serialization
- Conditional writes (`If-None-Match`, `If-Match`)
- Container sharding (`fitpod/body/yyyy/mm/<id>.ttl`)
- Body measurements CRUD operations

**Pod HTTP Abstraction (L5)**
- Location: `infrastructure/http/pod-http.ts`
- Only place `fetch` is called
- Used by L2 (Application) and L4 (Data)

**Architecture Constraints (AR-02, AR-03)**
- Only L4 (data) and L5 (auth) may import RDF/Solid libraries
- Only `infrastructure/http/pod-http.ts` calls `fetch`
- ESLint enforces these boundaries

### What's Missing

1. **Server-side authentication** - no Node.js script support
2. **Client credentials flow** - not implemented
3. **Programmatic token generation** - manual only via UI
4. **Seed script authentication** - `tools/seed/seed.ts` exists but auth unclear
5. **CI/CD authentication** - no automated test login
6. **Multi-environment credential management** - no strategy

## Goals

### Primary Goals

1. Add Client Credentials authentication for Node.js scripts
2. Update seed script to authenticate via client credentials
3. Create utility for programmatic token generation
4. Maintain architecture boundaries (AR-02, AR-03)
5. Keep browser auth unchanged

### Non-Goals

- Replace browser authentication
- Change existing L1-L5 boundaries
- Modify RDF data model
- Add new domain features

## Architecture Decision

### Option A: Separate Node.js Authentication Module (Recommended)

**Structure:**
```
tools/
  auth/
    solid-auth.ts          # Client credentials login
    generate-token.ts      # Programmatic token creation for CSS
  seed/
    seed.ts                # Update to use tools/auth
  scripts/
    fetch-data.ts          # Example authenticated script
```

**Pros:**
- Clean separation from browser auth
- No impact on web app layers
- Reusable across tools (seed, CI/CD, scripts)
- Can use `@inrupt/solid-client-authn-node` without conflicting with browser version

**Cons:**
- Duplicate Session abstraction (browser vs node)

### Option B: Unified Auth Abstraction

**Structure:**
```
packages/
  auth/
    src/
      browser-session.ts
      node-session.ts
      types.ts
```

**Pros:**
- Single source of truth for auth
- Shared types

**Cons:**
- Violates web app layer boundaries (packages shouldn't mix browser/node)
- Harder to enforce ESLint rules
- Overkill for current needs

**Decision:** Use Option A. Tools are outside web app, no layer violations.

## Implementation Plan

### Phase 1: Client Credentials Authentication

**Step 1.1: Install Dependencies**

Location: Root `package.json`

```bash
npm install @inrupt/solid-client-authn-node --save-dev
```

Rationale: Dev dependency since only used in tools, not runtime web app.

**Step 1.2: Create Auth Module**

File: `tools/auth/solid-auth.ts`

```typescript
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

  console.log(`✓ Authenticated as ${session.info.webId}`);
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
```

**Step 1.3: Update Seed Script**

File: `tools/seed/seed.ts`

Before:
```typescript
// Current implementation (review actual file first)
```

After:
```typescript
import { loginWithClientCredentials, loadCredentialsFromEnv } from '../auth/solid-auth.js';

async function seed() {
  const credentials = loadCredentialsFromEnv();
  const session = await loginWithClientCredentials(credentials);
  
  try {
    // Use session.fetch() for authenticated requests
    const response = await session.fetch('http://localhost:3001/my-pod/fitpod/');
    // ... seeding logic
  } finally {
    await session.logout();
  }
}
```

**Step 1.4: Add NPM Script**

File: Root `package.json`

```json
{
  "scripts": {
    "seed": "tsx tools/seed/seed.ts",
    "seed:clear": "tsx tools/seed/seed.ts --clear"
  }
}
```

Usage:
```bash
SOLID_CLIENT_ID="..." SOLID_CLIENT_SECRET="..." npm run seed
```

**Verification:**
1. Start CSS: `npm run pod:start`
2. Generate token at http://localhost:3001/.account/
3. Run seed script with credentials
4. Verify data written to Pod

---

### Phase 2: Programmatic Token Generation

**Step 2.1: Research CSS Token API**

CSS v7.3.0 token generation endpoint:
- Endpoint: `POST {server}/.account/account/{accountId}/credentials/token/`
- Requires: Account session cookie or existing token
- Returns: `{ id, secret }` pair

Reference: https://github.com/CommunitySolidServer/CommunitySolidServer/blob/main/documentation/client-credentials.md

**Step 2.2: Create Token Generator**

File: `tools/auth/generate-token.ts`

```typescript
import { Session } from '@inrupt/solid-client-authn-node';

export interface TokenRequest {
  name: string;
  webId: string;
}

export async function generateClientCredentials(
  issuer: string,
  accountId: string,
  accountPassword: string,
  request: TokenRequest
): Promise<{ clientId: string; clientSecret: string }> {
  // 1. Login with account credentials (initial setup)
  // 2. POST to /.account/account/{accountId}/credentials/token/
  // 3. Return client_id and client_secret
  
  throw new Error('Not implemented - CSS token generation endpoint details needed');
}
```

**Step 2.3: CLI Tool**

File: `tools/auth/cli.ts`

```typescript
#!/usr/bin/env tsx

import { generateClientCredentials } from './generate-token.js';

async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === 'generate') {
    // Interactive prompts for account credentials
    // Generate and print token
    // Optionally save to .env.local (git-ignored)
  } else {
    console.log('Usage: tsx tools/auth/cli.ts generate');
  }
}

main().catch(console.error);
```

**Verification:**
1. Run CLI to generate token
2. Use token in seed script
3. Verify authentication succeeds

---

### Phase 3: Environment Configuration

**Step 3.1: Environment Template**

File: `.env.example` (new file)

```bash
# Solid Pod Authentication (for tools/scripts only)
SOLID_CLIENT_ID=
SOLID_CLIENT_SECRET=
SOLID_OIDC_ISSUER=http://localhost:3001

# Example with solidcommunity.net
# SOLID_OIDC_ISSUER=https://solidcommunity.net
```

**Step 3.2: Update .gitignore**

Ensure already ignored:
```
.env
.env.*
!.env.example
```

**Step 3.3: Documentation Update**

File: `README.md`

Add section:
```markdown
### Seed local Pod with test data

1. Start CSS: `npm run pod:start`
2. Create account at http://localhost:3001/
3. Generate client credentials at http://localhost:3001/.account/
4. Set environment variables:
   ```bash
   export SOLID_CLIENT_ID="your-id"
   export SOLID_CLIENT_SECRET="your-secret"
   ```
5. Run: `npm run seed`
```

---

### Phase 4: CI/CD Integration (Optional)

**Step 4.1: GitHub Actions Secrets**

Secrets to add:
- `SOLID_CLIENT_ID`
- `SOLID_CLIENT_SECRET`
- `SOLID_OIDC_ISSUER`

**Step 4.2: Workflow Example**

File: `.github/workflows/integration-test.yml` (if created)

```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      
      - name: Install dependencies
        run: npm install
      
      - name: Start CSS
        run: npm run pod:start &
        
      - name: Wait for CSS
        run: sleep 10
      
      - name: Seed test data
        env:
          SOLID_CLIENT_ID: ${{ secrets.SOLID_CLIENT_ID }}
          SOLID_CLIENT_SECRET: ${{ secrets.SOLID_CLIENT_SECRET }}
          SOLID_OIDC_ISSUER: http://localhost:3001
        run: npm run seed
      
      - name: Run integration tests
        run: npm run test:integration
```

---

### Phase 5: Testing Strategy

**Unit Tests**

Location: `tests/unit/tools/auth/`

Tests:
- `loadCredentialsFromEnv()` with missing vars
- `loadCredentialsFromEnv()` with valid vars
- `loginWithClientCredentials()` success (mocked)
- `loginWithClientCredentials()` failure (mocked)

**Integration Tests**

Location: `tests/integration/solid-auth.test.ts` (new)

Prerequisites:
- Running CSS instance
- Valid client credentials

Tests:
1. Login with valid credentials
2. Fetch authenticated resource
3. Write to Pod
4. Logout
5. Verify token refresh works

**Manual Tests**

Checklist:
- [ ] Generate token via CSS UI
- [ ] Run seed script with credentials
- [ ] Verify data in Pod at http://localhost:3001/
- [ ] Run seed:clear
- [ ] Verify data removed
- [ ] Test with solidcommunity.net (if available)
- [ ] Test invalid credentials fail gracefully

---

## Security Considerations

### Credential Storage

**Local Development:**
- Store in `.env.local` (git-ignored)
- Never commit credentials

**CI/CD:**
- Use GitHub Secrets or equivalent
- Rotate regularly

**Production:**
- Use secrets manager (AWS Secrets Manager, Azure Key Vault, etc.)
- Environment-specific credentials

### Token Permissions

Client credentials tokens inherit permissions of linked WebID:
- Limit token scope if CSS supports it
- Use separate WebID for automation vs. personal data
- Revoke tokens when no longer needed

### Audit Trail

Consider logging:
- When credentials are used
- Which resources are accessed
- By which script/process

### Secret Leakage Prevention

- Run `npm audit` regularly
- Use `secretlint` or similar tool
- Review git history before pushing

---

## Rollout Plan

### Week 1: Foundation
- [ ] Install `@inrupt/solid-client-authn-node`
- [ ] Create `tools/auth/solid-auth.ts`
- [ ] Add environment variable loading
- [ ] Document credential generation process

### Week 2: Seed Script
- [ ] Review current `tools/seed/seed.ts` implementation
- [ ] Integrate authentication
- [ ] Test against local CSS
- [ ] Update documentation

### Week 3: Token Generation
- [ ] Research CSS token generation API
- [ ] Implement `generate-token.ts`
- [ ] Create CLI tool
- [ ] Test end-to-end flow

### Week 4: Testing & Documentation
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update README.md
- [ ] Update AGENTS.md
- [ ] Create `.env.example`

### Week 5: CI/CD (Optional)
- [ ] Set up GitHub Actions workflow
- [ ] Configure secrets
- [ ] Test automated seeding
- [ ] Document CI/CD setup

---

## Open Questions

1. **CSS Token Generation API**
   - What's the exact endpoint for v7.3.0?
   - Does it require account session or existing token?
   - Can we generate tokens programmatically without browser?

2. **Current Seed Script**
   - What does `tools/seed/seed.ts` currently do?
   - Does it authenticate at all?
   - What data does it seed?

3. **Browser Auth Impact**
   - Any changes needed to `apps/web/src/infrastructure/auth/`?
   - Should we unify Session interface?

4. **Multi-Issuer Support**
   - Support both local CSS and solidcommunity.net?
   - Different credentials per environment?

5. **Token Lifecycle**
   - How often should tokens be rotated?
   - Should we store multiple tokens per WebID?
   - Expiration handling?

---

## Dependencies

**New Runtime Dependencies:** None (web app unchanged)

**New Dev Dependencies:**
- `@inrupt/solid-client-authn-node` (^5.0.0 or latest)

**External Services:**
- Community Solid Server (already used)
- Solid Pod with client credentials support

---

## Success Criteria

### Must Have
- [x] Client credentials authentication works
- [ ] Seed script authenticates successfully
- [ ] Documentation complete
- [ ] No violations of AR-02, AR-03 rules
- [ ] Browser authentication unchanged

### Should Have
- [ ] Programmatic token generation
- [ ] Environment variable configuration
- [ ] Unit tests for auth module
- [ ] Integration tests with CSS

### Nice to Have
- [ ] CLI tool for token management
- [ ] CI/CD workflow example
- [ ] Token rotation strategy
- [ ] Support for multiple issuers

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| CSS token API undocumented | High | Medium | Use manual token generation initially; research later |
| Credentials leaked to git | Critical | Low | Pre-commit hooks, secretlint, .gitignore review |
| Token expiration breaks CI | Medium | Medium | Implement token refresh, monitor expiration |
| Architecture violation | Medium | Low | ESLint rules, code review |
| Browser auth conflicts | High | Low | Keep separate, different packages |

---

## References

- [Solid Client Credentials Flow](https://solidproject.org/TR/oidc-primer#clientcredentials)
- [CSS Client Credentials](https://github.com/CommunitySolidServer/CommunitySolidServer/blob/main/documentation/client-credentials.md)
- [@inrupt/solid-client-authn-node docs](https://docs.inrupt.com/developer-tools/javascript/client-libraries/authentication/node/)
- [FitPod AGENTS.md](../AGENTS.md)
- [FitPod Architecture](../apps/web/ARCHITECTURE_EVALUATION.md)

---

## Changelog

**2026-11-18:** Initial planning document created
