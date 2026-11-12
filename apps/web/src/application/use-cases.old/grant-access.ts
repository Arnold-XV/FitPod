import type { Result } from '../../../../domain/shared/result';
import type { GrantAccessInput } from '../../../../domain/shared/types';
import type { AclPort } from '../../../../data/acl/AclManager';
import type { DiscoveryPort } from '../../../../data/discovery';
import type { Clock } from '../../../../domain/shared/clock';
import type { EventBus } from '../../../../domain/shared/events';
import type { AppError } from '../../../../domain/shared/result';

export const grantAccess = async (
  input: {
    acl: AclPort;
    grants: any;
    inbox: any;
    discovery: DiscoveryPort;
    clock: Clock;
    events: EventBus;
  }
) => async (action: GrantAccessInput): Promise<Result<void>> => {
  try {
    // 1. Dereferensi WebID peminta
    const grantee = await input.discovery.resolveWebId(input.granteeWebId);
    if (!grantee) {
      return { ok: false, error: new Error('Grantee WebID not found') };
    }

    // 2. Peta kategori ke ACL
    const aclChanges = input.acl.mapCategoriesToAcl(input.category);

    // 3. Tulis ACL ke resource
    await input.acl.writeAcl(`fitpod/social/shared/friends/`, aclChanges);

    // 4. Read-back verifikasi
    const readBack = await input.acl.readBack(`fitpod/social/shared/friends/`);
    if (!readBack) {
      return { ok: false, error: new Error('ACL read-back failed') };
    }

    // 5. Catat grant
    const grant = await input.grants.create({
      granteeWebId: input.granteeWebId,
      role: input.role,
      category: input.category,
      grantedAt: input.clock.now(),
      expiresAt: new Date(input.clock.now().getTime() + 365 * 24 * 60 * 60 * 1000),
    });

    // 6. POST undangan ke inbox
    await input.inbox.postGrantInvitation(grantee.inboxUrl, grant);

    // 7. Emit event
    input.events.emit('GrantCreated', { grant });

    return { ok: true, value: undefined };
  } catch (error) {
    return { ok: false, error: error as AppError };
  }
};