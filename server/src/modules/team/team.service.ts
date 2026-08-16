import type { Role } from '@prisma/client';
import { teamRepository as repo } from './team.repository.js';
import { generateToken } from '../../shared/crypto.js';
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../../shared/errors.js';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface MemberView {
  userId: string;
  name: string | null;
  email: string;
  role: Role;
  joinedAt: string;
  isYou: boolean;
}
export interface InviteView {
  id: string;
  email: string;
  role: Role;
  status: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}
export interface TeamView {
  members: MemberView[];
  invitations: InviteView[];
}

export const teamService = {
  async getTeam(brandId: string, currentUserId: string): Promise<TeamView> {
    const [members, invites] = await Promise.all([
      repo.listMembers(brandId),
      repo.listPendingInvites(brandId),
    ]);
    return {
      members: members.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        isYou: m.user.id === currentUserId,
      })),
      invitations: invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        status: i.status,
        token: i.token,
        expiresAt: i.expiresAt.toISOString(),
        createdAt: i.createdAt.toISOString(),
      })),
    };
  },

  async invite(
    brandId: string,
    callerRole: Role,
    callerUserId: string,
    rawEmail: string,
    role: 'ADMIN' | 'MEMBER',
  ): Promise<InviteView> {
    const email = rawEmail.trim().toLowerCase();

    // Only OWNER may grant ADMIN. ADMIN can invite MEMBERs only. (OWNER can't be
    // granted through invites — ownership isn't transferred this way.)
    if (role === 'ADMIN' && callerRole !== 'OWNER') {
      throw new ForbiddenError('Only an owner can invite an admin');
    }

    // Already a member of this brand?
    const existingUser = await repo.findUserByEmail(email);
    if (existingUser) {
      const membership = await repo.findMembership(brandId, existingUser.id);
      if (membership) throw new ConflictError('That person is already a member of this brand');
    }

    const invite = await repo.upsertInvite({
      brandId,
      email,
      role,
      token: generateToken(32),
      invitedById: callerUserId,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    });

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      token: invite.token,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    };
  },

  async accept(
    token: string,
    currentUserId: string,
    currentEmail: string,
  ): Promise<{ brandId: string; brandName: string; role: Role }> {
    const invite = await repo.findInviteByToken(token);
    if (!invite) throw new NotFoundError('Invitation not found');

    if (invite.status !== 'PENDING') {
      throw new ConflictError('This invitation is no longer valid');
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      await repo.setInviteStatus(invite.id, 'EXPIRED');
      throw new ConflictError('This invitation has expired');
    }
    // The invite is bound to a specific email — a forwarded link can't be used
    // to join under a different account.
    if (invite.email.toLowerCase() !== currentEmail.toLowerCase()) {
      throw new ForbiddenError('This invitation was sent to a different email address');
    }

    const brand = await repo.brandName(invite.brandId);
    if (!brand) throw new NotFoundError('Brand no longer exists');

    // Idempotent: if they're already a member, just settle the invite.
    const existing = await repo.findMembership(invite.brandId, currentUserId);
    if (!existing) {
      await repo.createMembership({
        userId: currentUserId,
        brandId: invite.brandId,
        role: invite.role,
        invitedBy: invite.invitedById,
      });
    }
    await repo.setInviteStatus(invite.id, 'ACCEPTED', new Date());

    return { brandId: invite.brandId, brandName: brand.companyName, role: invite.role };
  },

  async updateRole(
    brandId: string,
    callerUserId: string,
    targetUserId: string,
    role: Role,
  ): Promise<void> {
    // Route already gates to OWNER. Guard the destructive edges here.
    if (targetUserId === callerUserId) {
      throw new ForbiddenError('You can’t change your own role');
    }
    const target = await repo.findMembership(brandId, targetUserId);
    if (!target) throw new NotFoundError('That person isn’t a member of this brand');
    if (target.role === role) return; // no-op

    // Don't leave the brand ownerless.
    if (target.role === 'OWNER' && role !== 'OWNER') {
      const owners = await repo.countRole(brandId, 'OWNER');
      if (owners <= 1) throw new ForbiddenError('A brand must always have at least one owner');
    }

    await repo.updateMemberRole(brandId, targetUserId, role);
  },

  async removeMember(
    brandId: string,
    callerRole: Role,
    callerUserId: string,
    targetUserId: string,
  ): Promise<void> {
    if (targetUserId === callerUserId) {
      throw new ForbiddenError('You can’t remove yourself');
    }
    const target = await repo.findMembership(brandId, targetUserId);
    if (!target) throw new NotFoundError('That person isn’t a member of this brand');

    // ADMIN can remove MEMBERs only; touching an OWNER or ADMIN needs OWNER.
    if (callerRole !== 'OWNER' && target.role !== 'MEMBER') {
      throw new ForbiddenError('Only an owner can remove an admin or owner');
    }
    if (target.role === 'OWNER') {
      const owners = await repo.countRole(brandId, 'OWNER');
      if (owners <= 1) throw new ForbiddenError('A brand must always have at least one owner');
    }

    await repo.deleteMembership(brandId, targetUserId);
  },

  async revokeInvite(brandId: string, inviteId: string): Promise<void> {
    const invite = await repo.findInviteById(brandId, inviteId);
    if (!invite) throw new NotFoundError('Invitation not found');
    if (invite.status !== 'PENDING') {
      throw new ValidationError('That invitation is not pending');
    }
    await repo.setInviteStatus(invite.id, 'REVOKED');
  },
};
