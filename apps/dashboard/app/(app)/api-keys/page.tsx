'use client';

import { useEffect, useState } from 'react';
import { apiKeys, ApiError, type ApiKeyListItem, type ApiKeyCreated } from '../../_lib/api';
import { Button, Card, Input, Alert, Spinner, cn } from '../../_components/ui';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // create flow
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function load() {
    try {
      setKeys(await apiKeys.list());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load API keys.');
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await apiKeys.create({ name: newName.trim() || undefined });
      setRevealed(created);
      setCreating(false);
      setNewName('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the key.');
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(id: string) {
    if (!confirm('Revoke this key? Any site using it will stop working immediately.')) return;
    setRevoking(id);
    try {
      await apiKeys.revoke(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke the key.');
    } finally {
      setRevoking(null);
    }
  }

  async function copyKey() {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const active = keys?.filter((k) => !k.revokedAt) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">API keys</h1>
          <p className="mt-1 text-sm text-muted">One key powers the AR embed on every product page.</p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)} size="sm">
            + Create key
          </Button>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      {/* Reveal-once banner */}
      {revealed && (
        <Card className="border-brand/30 bg-brand-soft p-4">
          <p className="text-sm font-medium text-ink">Your new API key — copy it now</p>
          <p className="mt-0.5 text-xs text-muted">
            For security we only show the full key once. Store it safely.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 truncate rounded-[var(--radius)] border border-line bg-surface px-3 py-2 font-mono text-[14px] text-ink">
              {revealed.key}
            </code>
            <Button size="sm" variant="secondary" onClick={copyKey}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRevealed(null)}>
              Done
            </Button>
          </div>
        </Card>
      )}

      {/* Create form */}
      {creating && (
        <Card className="p-4">
          <form onSubmit={onCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-[14px] font-medium text-ink">Key name (optional)</label>
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Production website"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" loading={busy}>Create</Button>
              <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* List */}
      <Card className="overflow-hidden">
        {keys === null ? (
          <div className="flex items-center justify-center py-16 text-muted">
            <Spinner className="text-brand" />
          </div>
        ) : active.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-ink">No API keys yet</p>
            <p className="mt-1 text-[14px] text-muted">Create your first key to start embedding AR.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            <div className="hidden grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-faint sm:grid">
              <span>Key</span>
              <span>Created</span>
              <span>Last used</span>
              <span />
            </div>
            {active.map((k) => (
              <div
                key={k.id}
                className="grid grid-cols-1 gap-2 px-5 py-3.5 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{k.name || 'Untitled key'}</p>
                  <code className="font-mono text-xs text-muted">{k.prefix}…</code>
                </div>
                <span className="text-[14px] text-muted sm:text-center">{fmtDate(k.createdAt)}</span>
                <span className="text-[14px] text-muted sm:text-center">{fmtDate(k.lastUsedAt)}</span>
                <button
                  onClick={() => onRevoke(k.id)}
                  disabled={revoking === k.id}
                  className={cn(
                    'justify-self-start rounded-[var(--radius)] px-2.5 py-1 text-[14px] font-medium text-danger hover:bg-danger/5 sm:justify-self-end',
                    revoking === k.id && 'opacity-60',
                  )}
                >
                  {revoking === k.id ? 'Revoking…' : 'Revoke'}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
