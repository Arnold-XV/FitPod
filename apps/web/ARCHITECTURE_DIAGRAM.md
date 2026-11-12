# FitPod Architecture Diagram

## System Overview

```

                         Browser (User)                              
                     http://localhost:5173                           

                         
                         

                   FitPod Web App (C1)                               
                   SPA/PWA - React                                    
                                                                      
     
   L1 Presentation (presentation/)                                
   - TestPage.tsx: Minimal UI for testing                        
     
                              Uses                                  
     
   L2 Application (application/)                                  
   - auth/login.ts, auth/logout.ts                               
   - body/add-measurement.ts, body/list-measurements.ts          
     
                              Coordinates                           
     
   L3 Domain (domain/)                          [PURE]           
   - shared/: Result, Clock, Logger, IdGenerator (ports)        
   - body/entities: BodyMeasurement, calculateBMI, validate     
   - body/ports: BodyRepository interface                       
     
                              Implemented by                        
     
   L4 Data Access (data/)                                         
   - solid/solid-io: RDF operations (N3.js)                      
   - repositories/body/: BodyRepository implementation           
     
                              Uses                                  
     
   L5 Infrastructure (infrastructure/)                            
   - auth/auth-session: Solid-OIDC wrapper                      
   - http/pod-http: Authenticated & plain fetch                 
   - logging/console-logger: Logger implementation              
   - clock/system-clock: Clock implementation                   
   - id-gen/uuid-generator: IdGenerator implementation          
     
                                                                    
     
   app/container.ts (Composition Root)                           
   - Dependency Injection Container                              
   - Wires all layers together                                   
     

                          HTTPS / DPoP Token
                         

                    Solid Pod (C2)                                   
         https://arnold.solidcommunity.net/                          
                                                                      
  /profile/card#me (WebID)                                          
  /fitpod/                                                           
     body/                                                        
        2026/11/<uuid>.ttl (sharded)                           
     profile/card.ttl                                            
     private/biometrics.ttl                                      

                         
                         

              Identity Provider (C3)                                 
              https://solidcommunity.net (OIDC)                     

```

## Data Flow: Add Body Measurement

```
User Input (TestPage)
        
        

 L1: TestPage.tsx                    
 - handleAddMeasurement()            
 - Collects: weightKg, heightCm     

                calls
               

 L2: addMeasurementUseCase           
 - Generates ID (idGenerator)        
 - Creates BodyMeasurement entity    

                calls
               

 L3: validateBodyMeasurement()       
 - Checks ranges (20-400kg, etc)    
 - Returns { valid, errors }         

                if valid
               

 L4: bodyRepository.add()            
 - Serializes to RDF (N3.js)        
 - Determines path (sharding)        

                calls
               

 L4: solidIo.putNew()                
 - Creates Turtle string             
 - Sets If-None-Match: *             

                calls
               

 L5: podHttp.authed()                
 - Adds DPoP token                   
 - Applies timeout (5s)              
 - Limits concurrency (6 parallel)   

                HTTPS PUT
               
    [Solid Pod: /fitpod/body/2026/11/<uuid>.ttl]
               
                201 Created
               

 Result<string> with measurement ID  
 - ok: true, value: "<uuid>"        

                returns
               
     [UI: Success message]
```

## Authentication Flow

```
User clicks "Login"
        
        

 L1: TestPage                            
 - handleLogin()                         
 - oidcIssuer: "solidcommunity.net"     

                calls
               

 L2: loginUseCase                        
 - Validates issuer                      

                calls
               

 L5: authSession.login()                 
 - clientId: "/client-id.jsonld"        
 - tokenType: "DPoP"                    

                redirects
               

 Identity Provider (solidcommunity.net)  
 - User enters credentials               
 - Authorizes app                        

                redirect back
               

 L5: authSession.restore()               
 - handleIncomingRedirect()             
 - Stores session                        
 - Returns { webId }                     

               
               
     [UI: Shows WebID, enables features]
```

## Layer Dependencies (Allowed Imports)

```

                    Layer Dependency Matrix                    

             Can Import From                                  

 L1          L2 (use cases), L3 (types only)                 
 (present)    Cannot import: L4, L5                         

 L2          L3 (entities, ports, pure functions)            
 (app)        Cannot import: L1, L4, L5                     

 L3          Nothing (pure domain)                            
 (domain)     Cannot import: Any other layer                

 L4          L3 (ports, entities), L5 (PodHttp, Logger)      
 (data)       Can import: n3, @rdfjs/types                 
              Cannot import: L1, L2                         

 L5          L3 (ports only)                                  
 (infra)      Can import: @inrupt/solid-client-authn       
              Cannot import: L1, L2, L4                     

 app/        All layers (wires them together)                
 (DI root)    Can import: L1, L2, L3, L4, L5               

```

## Error Flow with Result<T>

```
Any Layer Operation
        
         Success? 
                        
                        
            
             Result<T>               
             { ok: true, value: T }  
            
                       
                       
            [Continue processing]
        
         Failure? 
                         
                         
             
              Result<T>                       
              { ok: false, error: AppError }  
                                               
              error.type:                     
              - SessionExpired (401)          
              - AccessDenied (403)            
              - NotFound (404)                
              - Conflict (409/412)            
              - RateLimited (429)             
              - PodUnreachable (5xx/timeout) 
              - ValidationFailed              
              - NetworkError                  
             
                        
                        
        [UI displays appropriate message]
        [No HTTP errors leak to presentation]
```

## Port-Adapter Pattern

```

                  L3 Domain (Ports)                       
                                                           
  interface BodyRepository {                              
    list(): Promise<Result<BodyMeasurement[]>>           
    add(m: BodyMeasurement): Promise<Result<void>>       
  }                                                        
                                                           
  interface Clock {                                       
    now(): Date                                           
  }                                                        
                                                           
  interface Logger {                                      
    info(message: string): void                          
  }                                                        

                      Implemented by
                     

            L4/L5 Infrastructure (Adapters)               
                                                           
  class SolidBodyRepository implements BodyRepository {   
    - Uses N3.js for RDF                                  
    - Uses PodHttp for requests                           
    - Serializes to Turtle                                
  }                                                        
                                                           
  class SystemClock implements Clock {                    
    - Uses Date.now()                                     
  }                                                        
                                                           
  class ConsoleLogger implements Logger {                 
    - Uses console.log                                    
    - Sanitizes tokens                                    
  }                                                        

```

## RDF Serialization Example

```
TypeScript Entity (L3)

{
  id: "123e4567",
  date: "2026-11-12",
  weightKg: 70,
  heightCm: 170,
  schemaVersion: 1
}
        
         L4: bodyRepository.add()
         - serializeBodyMeasurement()
        
Turtle RDF (On Pod)

@prefix fp: <https://w3id.org/fitpod/ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<#it> a fp:BodyMeasurement ;
  fp:schemaVersion "1"^^xsd:integer ;
  fp:date "2026-11-12"^^xsd:date ;
  fp:weightKg "70"^^xsd:decimal ;
  fp:heightCm "170"^^xsd:decimal .
```

## Concurrency Control

```
Multiple Requests
    
     Request 1 
     Request 2 
     Request 3 
     Request 4 
     Request 5 
     Request 6 
     Request 7  (queued)
     Request 8  (queued)
         
         

 L5: PodHttp (p-limit)           
 - Limit: 6 parallel             
 - Queue: First 6 execute        
 - Others wait                    

               
               
    [Pod receives max 6 concurrent]
    
    Timeout per request: 5 seconds
    AbortController cancels on timeout
```

## Technology Stack Mapping

```

 Layer  Technologies                                     

 L1     - React 18                                       
        - React Router DOM                               
        - Minimal CSS                                    

 L2     - Pure TypeScript                                
        - Factory functions                              

 L3     - Pure TypeScript                                
        - No external dependencies                       

 L4     - N3.js (RDF operations)                        
        - @rdfjs/types                                   

 L5     - @inrupt/solid-client-authn-browser            
        - p-limit                                        
        - idb (not used yet)                            

 Build  - Vite                                           
        - TypeScript (strict mode)                      
        - Vitest                                         
        - ESLint                                         

```

## File Size Budget

```
Target:  500 KB gzip


 Library           Estimated Size       

 React + ReactDOM  ~140 KB              
 N3.js             ~80 KB               
 solid-authn       ~120 KB              
 p-limit, others   ~10 KB               
 App code          ~50 KB               

 TOTAL             ~400 KB            


Status: Under budget
Margin: ~100 KB available
```

## Architecture Rules Enforcement

```
ESLint Configuration


 Rule AR-02: Only L4/L5 import RDF libraries        
     
 Files: presentation/, application/, domain/         
 Blocked: n3, @rdfjs/*, @inrupt/*                   
 Status:  Enforced                                 



 Rule AR-03: Only L5/http calls fetch               
     
 Files: src/** except infrastructure/http/          
 Blocked: global fetch()                            
 Status:  Enforced                                 



 Rule AR-15: Logging via Logger only                
     
 Files: src/** except infrastructure/logging/       
 Blocked: console.log (warnings)                    
 Status:   Warnings only                          

```

---

**Legend**:
- `` = Component/Layer boundary
- `` = Vertical connection
- `` = Horizontal connection
- `` = Data flow direction
- `` = Implemented and passing
- `` = Partially implemented
- `` = Not allowed

**For implementation details, see**: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
