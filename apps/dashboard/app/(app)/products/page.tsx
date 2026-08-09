'use client';

import { useEffect, useRef, useState } from 'react';
import {
  products,
  slugify,
  ApiError,
  type Product,
} from '../../_lib/api';
import { Button, Card, Input, Field, Alert, Spinner, StatusBadge, cn } from '../../_components/ui';

export default function ProductsPage() {
  const [list, setList] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const polling = useRef<Set<string>>(new Set());

  async function load() {
    try {
      const p = await products.list();
      setList(p);
      // resume polling for anything already processing
      p.filter((x) => x.status === 'PROCESSING').forEach((x) => startPolling(x.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load products.');
    }
  }
  useEffect(() => {
    void load();
    return () => polling.current.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patchProduct(id: string, patch: Partial<Product>) {
    setList((cur) => cur?.map((p) => (p.id === id ? { ...p, ...patch } : p)) ?? cur);
  }

  function startPolling(id: string) {
    if (polling.current.has(id)) return;
    polling.current.add(id);
    const tick = async () => {
      if (!polling.current.has(id)) return;
      try {
        const s = await products.status(id);
        patchProduct(id, { status: s.status, glbUrl: s.glbUrl, usdzUrl: s.usdzUrl });
        if (s.status === 'READY' || s.status === 'FAILED') {
          polling.current.delete(id);
          return;
        }
      } catch {
        /* transient — keep polling */
      }
      setTimeout(tick, 5000);
    };
    setTimeout(tick, 4000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Products</h1>
          <p className="mt-1 text-sm text-muted">Create a product, generate its 3D model, preview the AR.</p>
        </div>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            + Add product
          </Button>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      {creating && (
        <CreateProductForm
          onCancel={() => setCreating(false)}
          onCreated={(p) => {
            setList((cur) => [p, ...(cur ?? [])]);
            setCreating(false);
            setExpanded(p.id);
          }}
          onError={setError}
        />
      )}

      <Card className="overflow-hidden">
        {list === null ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="text-brand" />
          </div>
        ) : list.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-ink">No products yet</p>
            <p className="mt-1 text-[13px] text-muted">Add your first product to generate its 3D model.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {list.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                expanded={expanded === p.id}
                onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
                onGenerate={async (urls) => {
                  setError(null);
                  try {
                    await products.generate(p.id, urls);
                    patchProduct(p.id, { status: 'PROCESSING' });
                    startPolling(p.id);
                  } catch (err) {
                    setError(err instanceof ApiError ? err.message : 'Could not start generation.');
                  }
                }}
              />
            ))}
          </div>
        )}
      </Card>

      <p className="text-xs text-faint">
        Photo <strong>file upload</strong> is coming next — for now paste public image URLs (1–4
        angles). The generated model appears here when ready (~90s).
      </p>
    </div>
  );
}

function CreateProductForm({
  onCreated,
  onCancel,
  onError,
}: {
  onCreated: (p: Product) => void;
  onCancel: () => void;
  onError: (m: string) => void;
}) {
  const [name, setName] = useState('');
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [d, setD] = useState('');
  const [busy, setBusy] = useState(false);
  const slug = slugify(name);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const p = await products.create({
        name: name.trim(),
        slug,
        ...(w ? { widthCm: Number(w) } : {}),
        ...(h ? { heightCm: Number(h) } : {}),
        ...(d ? { depthCm: Number(d) } : {}),
      });
      onCreated(p);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not create the product.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Product name" htmlFor="pname" hint={slug ? `URL slug: ${slug}` : undefined}>
          <Input id="pname" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Florence Coffee Table" required />
        </Field>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink">
            Real-world size (cm) — optional but recommended
          </label>
          <div className="grid grid-cols-3 gap-3">
            <Input inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} placeholder="Width" />
            <Input inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} placeholder="Height" />
            <Input inputMode="decimal" value={d} onChange={(e) => setD(e.target.value)} placeholder="Depth" />
          </div>
          <p className="mt-1 text-xs text-muted">Drives the true-to-life scale when placed in a room.</p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" loading={busy}>Create product</Button>
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}

function ProductRow({
  product,
  expanded,
  onToggle,
  onGenerate,
}: {
  product: Product;
  expanded: boolean;
  onToggle: () => void;
  onGenerate: (urls: string[]) => void;
}) {
  const [urls, setUrls] = useState('');
  const dims =
    product.widthCm && product.heightCm
      ? `${product.widthCm}×${product.heightCm}${product.depthCm ? `×${product.depthCm}` : ''} cm`
      : null;

  function generate() {
    const list = urls
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter(Boolean);
    if (list.length === 0) return;
    onGenerate(list.slice(0, 4));
  }

  return (
    <div>
      <div className="grid grid-cols-1 items-center gap-2 px-5 py-3.5 sm:grid-cols-[1fr_auto_auto_auto] sm:gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{product.name}</p>
          <code className="font-mono text-xs text-muted">{product.slug}</code>
        </div>
        <span className="text-[13px] text-muted sm:text-center">{dims ?? '—'}</span>
        <StatusBadge status={product.status} />
        <button
          onClick={onToggle}
          className="justify-self-start rounded-[var(--radius)] border border-line px-2.5 py-1 text-[13px] font-medium text-ink hover:bg-surface-2 sm:justify-self-end"
        >
          {product.status === 'READY' ? 'Preview / Regenerate' : 'Generate'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-line bg-surface-2/40 px-5 py-4">
          {product.status === 'READY' && product.glbUrl && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <a
                href={product.glbUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-brand px-3 py-1.5 text-[13px] font-medium text-brand-fg hover:bg-brand-hover"
              >
                Open 3D model
              </a>
              <span className="text-xs text-muted">Model is live on the AR endpoint for this product.</span>
            </div>
          )}
          {product.status === 'PROCESSING' ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Spinner className="text-brand" /> Generating the 3D model… (~90 seconds)
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-[13px] font-medium text-ink">
                Photo URLs (1–4 angles, one per line)
              </label>
              <textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                rows={3}
                placeholder={'https://…/front.jpg\nhttps://…/side.jpg'}
                className="w-full rounded-[var(--radius)] border border-line bg-surface px-3 py-2 font-mono text-[13px] text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
              />
              <Button size="sm" onClick={generate} className={cn(!urls.trim() && 'opacity-60')}>
                {product.status === 'READY' ? 'Regenerate' : 'Generate 3D model'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
