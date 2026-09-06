import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Auth } from '@synapse/firebase/admin';
import { FIREBASE_AUTH } from '../firebase.tokens';
import { MembershipRepository } from '../repositories/membership.repository';
import { SessionRepository } from '../repositories/session.repository';

@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(FIREBASE_AUTH) private readonly auth: Auth,
    private readonly memberships: MembershipRepository,
    private readonly sessions: SessionRepository,
  ) {}

  private async assertMember(tenantId: string, userId: string) {
    const member = await this.memberships.find(tenantId, userId);
    if (!member) throw new NotFoundException('Usuário não encontrado neste tenant');
    return member;
  }

  async block(tenantId: string, actorId: string, userId: string, blocked: boolean) {
    await this.assertMember(tenantId, userId);
    await this.auth.updateUser(userId, { disabled: blocked });
    await this.memberships.setStatus(tenantId, userId, blocked ? 'blocked' : 'active', actorId);
    if (blocked) {
      await this.sessions.revokeAll(tenantId, userId);
      await this.auth.revokeRefreshTokens(userId);
    }
    return { userId, blocked, updatedBy: actorId };
  }

  async requireMfa(tenantId: string, actorId: string, userId: string, required: boolean) {
    await this.assertMember(tenantId, userId);
    await this.memberships.setMfaRequired(tenantId, userId, required, actorId);
    return { userId, mfaRequired: required, updatedBy: actorId };
  }

  async revokeSessions(tenantId: string, userId: string) {
    await this.assertMember(tenantId, userId);
    await this.sessions.revokeAll(tenantId, userId);
    await this.auth.revokeRefreshTokens(userId);
    return { userId, revoked: true };
  }

  async createPasswordResetLink(tenantId: string, userId: string) {
    await this.assertMember(tenantId, userId);
    const user = await this.auth.getUser(userId);
    if (!user.email) throw new NotFoundException('Usuário não possui e-mail');
    return { userId, resetLink: await this.auth.generatePasswordResetLink(user.email) };
  }
}
