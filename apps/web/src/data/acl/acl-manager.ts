import type { SolidIo } from '@/data/solid/solid-io';
import type { Result } from '@/domain/shared/result';
import { success, failure, appError } from '@/domain/shared/result';
import { buildAclTurtle, type AclRule } from './acl-builder';

export interface AclManager {
  /**
   * Discover ACL file location for a resource.
   * Follows Link rel="acl" header or convention (.acl suffix).
   */
  discoverAclUrl(resourceUrl: string): Promise<Result<string>>;
  
  /**
   * Read existing ACL file.
   */
  readAcl(aclUrl: string): Promise<Result<string>>;
  
  /**
   * Write ACL file (creates or replaces).
   */
  writeAcl(aclUrl: string, rules: AclRule[]): Promise<Result<void>>;
  
  /**
   * Grant access to container for a WebID.
   */
  grantContainerAccess(
    containerUrl: string,
    agentWebId: string,
    modes: ('Read' | 'Write')[]
  ): Promise<Result<void>>;
  
  /**
   * Revoke access from container for a WebID.
   */
  revokeContainerAccess(
    containerUrl: string,
    agentWebId: string
  ): Promise<Result<void>>;
}

export const createAclManager = (solidIo: SolidIo): AclManager => {
  return {
    async discoverAclUrl(resourceUrl: string): Promise<Result<string>> {
      try {
        // HEAD request to get Link header
        const response = await solidIo.getHttp().authed(resourceUrl, {
          method: 'HEAD',
        });
        
        if (!response.ok) {
          return failure(appError('NotFound', 'Resource not found'));
        }
        
        // Check for Link rel="acl" header
        const linkHeader = response.headers.get('Link');
        if (linkHeader) {
          const aclMatch = linkHeader.match(/<([^>]+)>;\s*rel="acl"/);
          if (aclMatch && aclMatch[1]) {
            const aclUrl = new URL(aclMatch[1], resourceUrl).href;
            return success(aclUrl);
          }
        }
        
        // Fallback: convention-based .acl suffix
        const url = new URL(resourceUrl);
        if (url.pathname.endsWith('/')) {
          // Container: /path/.acl
          return success(`${resourceUrl}.acl`);
        } else {
          // Resource: /path/file.ttl.acl
          return success(`${resourceUrl}.acl`);
        }
      } catch (error) {
        return failure(
          appError(
            'NetworkError',
            'Failed to discover ACL URL',
            error instanceof Error ? error.message : String(error)
          )
        );
      }
    },
    
    async readAcl(aclUrl: string): Promise<Result<string>> {
      try {
        const response = await solidIo.getHttp().authed(aclUrl, {
          headers: { Accept: 'text/turtle' },
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            // No ACL file exists yet (will inherit from parent)
            return success('');
          }
          return failure(appError('AccessDenied', 'Cannot read ACL file'));
        }
        
        const text = await response.text();
        return success(text);
      } catch (error) {
        return failure(
          appError(
            'NetworkError',
            'Failed to read ACL',
            error instanceof Error ? error.message : String(error)
          )
        );
      }
    },
    
    async writeAcl(aclUrl: string, rules: AclRule[]): Promise<Result<void>> {
      try {
        const turtle = buildAclTurtle(rules);
        
        const response = await solidIo.getHttp().authed(aclUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'text/turtle',
          },
          body: turtle,
        });
        
        if (!response.ok) {
          return failure(
            appError(
              'AccessDenied',
              `Failed to write ACL: ${response.status} ${response.statusText}`
            )
          );
        }
        
        return success(undefined);
      } catch (error) {
        return failure(
          appError(
            'NetworkError',
            'Failed to write ACL',
            error instanceof Error ? error.message : String(error)
          )
        );
      }
    },
    
    async grantContainerAccess(
      containerUrl: string,
      agentWebId: string,
      modes: ('Read' | 'Write')[]
    ): Promise<Result<void>> {
      // 1. Discover ACL URL
      const aclUrlResult = await this.discoverAclUrl(containerUrl);
      if (!aclUrlResult.ok) return aclUrlResult;
      const aclUrl = aclUrlResult.value;
      
      // 2. Read existing ACL (if any)
      const existingAclResult = await this.readAcl(aclUrl);
      if (!existingAclResult.ok) return existingAclResult;
      
      // 3. Parse existing rules (simplified: just append new rule)
      // TODO: Parse existing Turtle and merge rules to avoid duplicates
      
      // 4. Build new rule for agent
      const newRule: AclRule = {
        agent: agentWebId,
        modes: modes,
        default: containerUrl, // Inherited by children
      };
      
      // 5. Write ACL (for MVP, overwrite with single rule)
      // TODO: Merge with existing owner rules
      return await this.writeAcl(aclUrl, [newRule]);
    },
    
    async revokeContainerAccess(
      containerUrl: string,
      _agentWebId: string
    ): Promise<Result<void>> {
      // 1. Discover ACL URL
      const aclUrlResult = await this.discoverAclUrl(containerUrl);
      if (!aclUrlResult.ok) return aclUrlResult;
      const aclUrl = aclUrlResult.value;
      
      // 2. Read existing ACL
      const existingAclResult = await this.readAcl(aclUrl);
      if (!existingAclResult.ok) return existingAclResult;
      
      // 3. Parse and filter out rules for agentWebId
      // TODO: Parse Turtle, remove matching authorization, re-serialize
      
      // 4. For MVP: write empty ACL (removes all non-owner access)
      return await this.writeAcl(aclUrl, []);
    },
  };
};
