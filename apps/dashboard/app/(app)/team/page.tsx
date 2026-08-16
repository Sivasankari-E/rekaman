'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  team,
  ApiError,
  type TeamView,
  type TeamMember,
  type TeamInvite,
  type Role,
} from '../../_lib/api';
import { Button, Card, Input, Field, Alert, Spinner, cn } from '../../_components/ui';

function inviteLink(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/accept-invite?token=${encodeURIComponent(token)}`;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ROLE_STYLE: Record<Role, string> = {
  OWNER: 'bg-brand-soft text-brand',
  ADMIN: 'bg-surface-2 text-ink',
  MEMBER: 'bg-surface-2 text-muted',
};
function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', ROLE_STYLE[role])}>
      {role.toLowerCase()}
    </span>
  );
}

export default function TeamPage() {
  const [data, setData] = useState<TeamView | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setData(await team.get());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your team.');
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const myRole: Role | null = useMemo(
    () => data?.members.find((m) => m.isYou)?.role ?? null,
    [data],
  );
  const isOwner = myRole === 'OWNER';
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Team</h1>
        <p className="mt-1 text-sm text-muted">Invite teammates and manage who can access this brand.</p>
      </div>

      {error && <Alert>{error}</Alert>}

      {!data ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="text-brand" />
        </div>
      ) : (
        <>
          {canManage && <InviteForm myRole={myRole!} onChange={load} onError={setError} />}
          <MembersCard
            members={data.members}
            isOwner={isOwner}
            canManage={canManage}
            onChange={load}
            onError={setError}
          />
          {canManage && data.invitations.length > 0 && (
            <InvitesCard invites={data.invitations} onChange={load} onError={setError} />
          )}
        </>
      )}
    </div>
  );
}

function InviteForm({
  myRole,
  onChange,
  onError,
}: {
  myRole: Role;
  onChange: () => void;
  onError: (m: string | null) => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<TeamInvite | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    setBusy(true);
    setCreated(null);
    try {
      const inv = await team.invite({ email: email.trim(), role });
      setCreated(inv);
      setEmail('');
      onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not send the invite.');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!created) return;
    await navigator.clipboard.writeText(inviteLink(created.token));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-ink">Invite a teammate</p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label="Email">
            <Input
              type="email"
              required
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
        </div>
        <div className="sm:w-40">
          <Field label="Role">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MEMBER')}
              className="h-10 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-brand"
            >
              <option value="MEMBER">Member</option>
              {/* Only an owner can grant admin. */}
              {myRole === 'OWNER' && <option value="ADMIN">Admin</option>}
            </select>
          </Field>
        </div>
        <Button type="submit" loading={busy} className="sm:w-auto">
          Create invite
        </Button>
      </form>

      {created && (
        <div className="mt-4 rounded-[var(--radius)] border border-line bg-surface-2 p-3">
          <p className="text-[13px] text-muted">
            Invite ready for <span className="font-medium text-ink">{created.email}</span>. Share this
            link — they sign in with that email to join.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={inviteLink(created.token)}
              className="min-w-0 flex-1 truncate rounded-[var(--radius)] border border-line bg-surface px-3 py-2 text-[12px] text-muted"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button variant="secondary" size="sm" onClick={copy} type="button">
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function MembersCard({
  members,
  isOwner,
  canManage,
  onChange,
  onError,
}: {
  members: TeamMember[];
  isOwner: boolean;
  canManage: boolean;
  onChange: () => void;
  onError: (m: string | null) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function changeRole(m: TeamMember, role: Role) {
    onError(null);
    setBusyId(m.userId);
    try {
      await team.setRole(m.userId, role);
      onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not change the role.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(m: TeamMember) {
    if (!confirm(`Remove ${m.name || m.email} from this brand?`)) return;
    onError(null);
    setBusyId(m.userId);
    try {
      await team.remove(m.userId);
      onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not remove the member.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="divide-y divide-line p-0">
      <div className="px-5 py-3.5">
        <p className="text-sm font-medium text-ink">Members ({members.length})</p>
      </div>
      {members.map((m) => {
        const canRemove = canManage && !m.isYou && (isOwner || m.role === 'MEMBER');
        const canChangeRole = isOwner && !m.isYou;
        return (
          <div key={m.userId} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold uppercase text-brand">
              {(m.name || m.email).slice(0, 1)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-ink">
                {m.name || m.email}
                {m.isYou && <span className="ml-2 text-[12px] font-normal text-faint">You</span>}
              </p>
              {m.name && <p className="truncate text-[12.5px] text-muted">{m.email}</p>}
            </div>

            {canChangeRole ? (
              <select
                value={m.role}
                disabled={busyId === m.userId}
                onChange={(e) => changeRole(m, e.target.value as Role)}
                className="h-8 rounded-[var(--radius)] border border-line bg-surface px-2 text-[12px] text-ink outline-none focus:border-brand disabled:opacity-50"
              >
                <option value="OWNER">Owner</option>
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
              </select>
            ) : (
              <RoleBadge role={m.role} />
            )}

            {canRemove && (
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger/10"
                loading={busyId === m.userId}
                onClick={() => remove(m)}
              >
                Remove
              </Button>
            )}
          </div>
        );
      })}
    </Card>
  );
}

function InvitesCard({
  invites,
  onChange,
  onError,
}: {
  invites: TeamInvite[];
  onChange: () => void;
  onError: (m: string | null) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copy(inv: TeamInvite) {
    await navigator.clipboard.writeText(inviteLink(inv.token));
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 1600);
  }
  async function revoke(inv: TeamInvite) {
    onError(null);
    setBusyId(inv.id);
    try {
      await team.revokeInvite(inv.id);
      onChange();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not revoke the invite.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="divide-y divide-line p-0">
      <div className="px-5 py-3.5">
        <p className="text-sm font-medium text-ink">Pending invites ({invites.length})</p>
      </div>
      {invites.map((inv) => (
        <div key={inv.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-ink">{inv.email}</p>
            <p className="text-[12.5px] text-muted">Expires {fmtDate(inv.expiresAt)}</p>
          </div>
          <RoleBadge role={inv.role} />
          <Button variant="secondary" size="sm" onClick={() => copy(inv)}>
            {copiedId === inv.id ? 'Copied' : 'Copy link'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger/10"
            loading={busyId === inv.id}
            onClick={() => revoke(inv)}
          >
            Revoke
          </Button>
        </div>
      ))}
    </Card>
  );
}
