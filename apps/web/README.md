# FitPod Web - Backend Testing Frontend

A minimal frontend implementation for testing FitPod's Solid Pod backend architecture.

## Quick Start

### 1. Install Dependencies

```powershell
pnpm install
```

### 2. Start Development Server

```powershell
pnpm dev
```

The app will open at http://localhost:5173

### 3. Test the Backend

1. **Login**: Click "Login" and authenticate with a Solid Pod provider (e.g., https://solidcommunity.net)
2. **Test Connection**: Click "Test Read WebID Document" to verify Pod connectivity
3. **Add Measurement**: Enter weight and height, click "Add Measurement"
4. **View Data**: Click "Refresh List" to see measurements stored in your Pod

## What This Tests

This implementation validates the **Software Architecture Document (SAD) v1.1** specifications:

###  Layered Architecture (SAD Section 4)
- **L1 Presentation** (`presentation/`) - React UI
- **L2 Application** (`application/`) - Use cases
- **L3 Domain** (`domain/`) - Pure business logic
- **L4 Data** (`data/`) - Repository implementations
- **L5 Infrastructure** (`infrastructure/`) - External concerns

###  Solid Pod Integration
- Solid-OIDC authentication with DPoP tokens
- RDF read/write operations using N3.js
- Conditional writes (If-None-Match, If-Match)
- Container sharding (yyyy/mm structure)

###  Architecture Rules (AR-01 to AR-22)
- Layer dependencies enforced by ESLint
- Only L4/L5 import RDF libraries (AR-02)
- Only L5/http calls fetch (AR-03)
- L3 domain is pure (AR-04)
- Result<T> type for error handling (AR-17)

## Available Commands

```powershell
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm preview          # Preview production build

# Quality
pnpm typecheck        # Run TypeScript checks
pnpm lint             # Run ESLint
pnpm test             # Run unit tests
pnpm test:ui          # Run tests with UI
```

## Project Structure

```
src/
 domain/              # L3 - Pure domain logic
    shared/          # Result, Clock, Logger, IdGenerator
    body/            # Body measurement entities, validators, ports
 application/         # L2 - Use cases
    auth/            # Login, logout use cases
    body/            # Body measurement use cases
 data/                # L4 - Data access
    solid/           # Solid I/O operations (RDF)
    repositories/    # Repository implementations
 infrastructure/      # L5 - Infrastructure
    auth/            # Solid-OIDC wrapper
    http/            # Pod HTTP client
    logging/         # Logger implementation
    clock/           # System clock
    id-gen/          # UUID generator
 app/                 # Composition root
    container.ts     # Dependency injection container
 presentation/        # L1 - UI (minimal for testing)
     pages/TestPage.tsx
```

## Documentation

- **[TESTING.md](./TESTING.md)** - Testing approach and workflow
- **[TEST_PLAN.md](./TEST_PLAN.md)** - Detailed test scenarios and procedures
- **[ARCHITECTURE_EVALUATION.md](./ARCHITECTURE_EVALUATION.md)** - Architecture compliance evaluation
- **[Software Architecture Document v1.1](../../personal/FitPod-SAD-v1.1.md)** - Full architecture specification

## Key Features Demonstrated

### Authentication
- Solid-OIDC login flow
- Session restoration
- DPoP token authentication
- Multiple provider support

### Data Operations
- Create body measurements
- Read measurements from Pod
- RDF serialization (Turtle format)
- Conditional writes for conflict prevention
- Container sharding for scalability

### Error Handling
- Result<T> pattern across all layers
- HTTP error mapping (401, 403, 404, 409, 412, 5xx)
- Timeout handling (5 seconds)
- Graceful degradation

### Code Quality
- TypeScript strict mode
- ESLint enforcement of architecture rules
- Unit tests for domain logic
- 70%+ test coverage on L3

## Testing Against Different Pod Providers

### SolidCommunity.net (Public)
```
OIDC Issuer: https://solidcommunity.net
```

### Local Community Solid Server
```bash
# Install CSS
pnpm add -D @solid/community-server@7.1.9

# Run CSS
pnpm exec community-solid-server -c @css:config/file.json -p 3001

# Use in app
OIDC Issuer: http://localhost:3001/
```

### Inrupt Pod Spaces
```
OIDC Issuer: https://inrupt.net
```

## Validation Checklist

- [x] L1-L5 layered architecture implemented
- [x] Solid-OIDC authentication working
- [x] RDF read/write operations functional
- [x] Conditional writes implemented
- [x] Domain validation enforced
- [x] Error handling with Result<T>
- [x] Unit tests passing
- [x] ESLint rules enforcing architecture
- [x] TypeScript strict mode
- [ ] SHACL validation (pending)
- [ ] ACL management (pending)
- [ ] Integration tests (pending)

## Known Limitations

This is a **testing frontend**, not a production application:

1. **No UI polish** - Minimal styling, focus on functionality
2. **No SHACL validation** - Validator called but engine not integrated
3. **No ACL management** - Bootstrap and privacy checks not implemented
4. **Simplified storage root** - Uses URL parsing instead of reading pim:storage
5. **No cache layer** - IndexedDB not implemented
6. **Limited error recovery** - No exponential backoff or circuit breaker
7. **Single module** - Only body measurements, other modules pending

## Architecture Grade

Based on evaluation against SAD v1.1:

**Overall: A- (Excellent with Minor Gaps)**

-  Layer separation: Excellent
-  Solid integration: Working
-  Type safety: Excellent
-  Error handling: Good
-  Feature completeness: 70% (MVP scope)

See [ARCHITECTURE_EVALUATION.md](./ARCHITECTURE_EVALUATION.md) for detailed analysis.

## Next Steps

1. **Complete high-priority items**:
   - Integrate shacl-engine for validation
   - Implement Bootstrap use case with ACL
   - Add integration tests against CSS
   - Improve error recovery

2. **Expand modules**:
   - Nutrition tracking
   - Workout logging
   - Social features

3. **Production readiness**:
   - Cache layer (IndexedDB)
   - Offline support
   - Better UX

## Contributing

This is a test implementation. For production development:

1. Follow SAD v1.1 specifications
2. Maintain layer boundaries (enforced by ESLint)
3. Add tests for new features (70%+ coverage on L3)
4. Update architecture evaluation

## License

[To be determined based on project requirements]

## Support

For issues or questions:
1. Check [TEST_PLAN.md](./TEST_PLAN.md) troubleshooting section
2. Review [TESTING.md](./TESTING.md) for testing procedures
3. Consult [SAD v1.1](../../personal/FitPod-SAD-v1.1.md) for architecture details

---

**Status**:  Backend architecture validated, ready for next phase

**Last Updated**: November 12, 2026
