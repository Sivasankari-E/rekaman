import { prisma } from '../../shared/db.js';
import type { Role } from '@prisma/client';

/*
 * Team reads/writes — all brand-scoped (brandId is a required arg per the
 * tenant-isolation rule). Members live in Membership; pending invites live in
 * OrgInvitation (unique on [brandId, email], so re-inviting upserts).
 */
export const teamRepository = {
  listMembers: (brandId: string) =>
    prisma.membership.findMany({
      where: { brandId },
      orderBy: { joinedAt: 'asc' },
      select: {
        role: true,
        joinedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),

  listPendingInvites: (brandId: string) =>
    prisma.orgInvitation.findMany({
      where: { brandId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    }),

  findMembership: (brandId: string, userId: string) =>
    prisma.membership.findUnique({
      where: { userId_brandId: { userId, brandId } },
    }),

  countRole: (brandId: string, role: Role) =>
    prisma.membership.count({ where: { brandId, role } }),

  findUserByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email }, select: { id: true, email: true } }),

  brandName: (brandId: string) =>
    prisma.brand.findUnique({ where: { id: brandId }, select: { companyName: true } }),

  upsertInvite: (data: {
    brandId: string;
    email: string;
    role: Role;
    token: string;
    invitedById: string;
    expiresAt: Date;
  }) =>
    prisma.orgInvitation.upsert({
      where: { brandId_email: { brandId: data.brandId, email: data.email } },
      // Re-inviting a previously revoked/expired email resets it to a fresh
      // PENDING invite with a new token — the unique [brandId,email] row is reused.
      update: {
        role: data.role,
        token: data.token,
        invitedById: data.invitedById,
        status: 'PENDING',
        expiresAt: data.expiresAt,
        acceptedAt: null,
      },
      create: data,
    }),

  findInviteByToken: (token: string) =>
    prisma.orgInvitation.findUnique({ where: { token } }),

  findInviteById: (brandId: string, id: string) =>
    prisma.orgInvitation.findFirst({ where: { id, brandId } }),

  setInviteStatus: (id: string, status: 'ACCEPTED' | 'REVOKED' | 'EXPIRED', acceptedAt?: Date) =>
    prisma.orgInvitation.update({
      where: { id },
      data: { status, ...(acceptedAt ? { acceptedAt } : {}) },
    }),

  createMembership: (data: { userId: string; brandId: string; role: Role; invitedBy: string }) =>
    prisma.membership.create({ data }),

  updateMemberRole: (brandId: string, userId: string, role: Role) =>
    prisma.membership.update({
      where: { userId_brandId: { userId, brandId } },
      data: { role },
    }),

  deleteMembership: (brandId: string, userId: string) =>
    prisma.membership.delete({
      where: { userId_brandId: { userId, brandId } },
    }),
};
