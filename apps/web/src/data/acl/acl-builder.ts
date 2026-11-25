import { ACL } from '@fitpod/vocab';
import type { AccessScope, AccessPermission } from '@/domain/access/entities';

export interface AclRule {
  agent: string; // WebID
  modes: ('Read' | 'Write' | 'Control')[];
  accessTo?: string; // Specific resource
  default?: string; // Container for inherited permissions
}

/**
 * Generate ACL Turtle document from rules.
 * Follows Solid ACL spec: https://solidproject.org/TR/wac
 */
export const buildAclTurtle = (rules: AclRule[]): string => {
  const prefix = `@prefix acl: <${ACL}> .\n\n`;
  
  const ruleBlocks = rules.map((rule, index) => {
    const authId = `#auth${index}`;
    const modes = rule.modes.map(m => `acl:${m}`).join(', ');
    
    let block = `<${authId}> a acl:Authorization ;\n`;
    block += `  acl:agent <${rule.agent}> ;\n`;
    block += `  acl:mode ${modes}`;
    
    if (rule.accessTo) {
      block += ` ;\n  acl:accessTo <${rule.accessTo}>`;
    }
    
    if (rule.default) {
      block += ` ;\n  acl:default <${rule.default}>`;
    }
    
    block += ' .';
    return block;
  });
  
  return prefix + ruleBlocks.join('\n\n');
};

/**
 * Map AccessScope to container paths.
 */
export const scopeToContainerPaths = (
  storageRoot: string,
  scope: AccessScope[]
): string[] => {
  const basePath = `${storageRoot}fitpod`;
  
  return scope.map(s => {
    switch (s) {
      case 'body': return `${basePath}/body/`;
      case 'workout': return `${basePath}/workout/`;
      case 'nutrition': return `${basePath}/nutrition/`;
      case 'health': return `${basePath}/health/`;
      case 'parq': return `${basePath}/health/parq/`; // Specific PAR-Q+ container
    }
  });
};

/**
 * Map AccessPermission to ACL modes.
 */
export const permissionToModes = (
  permission: AccessPermission
): ('Read' | 'Write')[] => {
  switch (permission) {
    case 'read': return ['Read'];
    case 'readwrite': return ['Read', 'Write'];
  }
};
