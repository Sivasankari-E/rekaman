'use client';

import { useEffect, useRef, useState } from 'react';
import {
  products,
  auth,
  slugify,
  uploadProductPhoto,
  ApiError,
  type Product,
} from '../../_lib/api';
import { Button, Card, Input, Field, Alert, Spinner, StatusBadge, cn } from '../../_components/ui';
import { Model3DModal } from '../../_components/Model3DModal';
import { ShareModal } from '../../_components/ShareModal';

export default function ProductsPage() {
  const [list, setList] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ glbUrl: string; name: string } | null>(null);
  const [share, setShare] = useState<{ slug: string; name: string } | null>(null);
  // Brand slug for building keyless share links (rekaman.io/s/{brand}/{slug}).
  const [brandSlug, setBrandSlug] = useState<string | null>(null);
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
    // Resolve the active brand's slug for share links (best-effort).
    auth
      .me()
      .then((me) => {
        const active =
          me.memberships.find((m) => m.brandId === me.activeBrandId) ?? me.memberships[0];
        setBrandSlug(active?.brandSlug ?? null);
      })
      .catch(() => {});
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
            <p className="mt-1 text-[14px] text-muted">Add your first product to generate its 3D model.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {list.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                canShare={Boolean(brandSlug)}
                onShare={() => setShare({ slug: p.slug, name: p.name })}
                expanded={expanded === p.id}
                onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
                onPreview={(glbUrl, name) => setPreview({ glbUrl, name })}
                onGenerate={async (urls, captureMode) => {
                  setError(null);
                  try {
                    await products.generate(p.id, urls, captureMode);
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
        Tip: one sharp, high-resolution photo on a plain background gives the best 3D model — the
        AI fills in the unseen sides. The generated model appears here when ready (~90s).
      </p>

      {preview && (
        <Model3DModal glbUrl={preview.glbUrl} name={preview.name} onClose={() => setPreview(null)} />
      )}
      {share && brandSlug && (
        <ShareModal
          brandSlug={brandSlug}
          productSlug={share.slug}
          productName={share.name}
          onClose={() => setShare(null)}
        />
      )}
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
          <label className="mb-1.5 block text-[14px] font-medium text-ink">
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
  canShare,
  onShare,
  expanded,
  onToggle,
  onPreview,
  onGenerate,
}: {
  product: Product;
  canShare: boolean;
  onShare: () => void;
  expanded: boolean;
  onToggle: () => void;
  onPreview: (glbUrl: string, name: string) => void;
  onGenerate: (urls: string[], captureMode: 'single' | 'multi') => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  // Multi-angle reconstruction: only offered (and only helps) with 2+ photos
  // that are a MATCHED set — same object, consistent framing. Off by default;
  // single-photo ultra is the safe, higher-quality path for typical images.
  const [multiAngle, setMultiAngle] = useState(false);
  const dims =
    product.widthCm && product.heightCm
      ? `${product.widthCm}×${product.heightCm}${product.depthCm ? `×${product.depthCm}` : ''} cm`
      : null;

  function pickFiles(selected: FileList | null) {
    if (!selected) return;
    setUploadErr(null);
    const incoming = Array.from(selected).filter((f) => f.type.startsWith('image/'));
    setFiles((cur) => {
      const combined = [...cur];
      for (const f of incoming) {
        if (combined.length >= 4) break;
        // dedupe by name + size so re-picking the same file doesn't double it
        if (!combined.some((x) => x.name === f.name && x.size === f.size)) combined.push(f);
      }
      return combined;
    });
  }

  function removeFile(idx: number) {
    setFiles((cur) => cur.filter((_, i) => i !== idx));
  }

  async function uploadAndGenerate() {
    if (files.length === 0) return;
    setUploadErr(null);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setUploadMsg(`Uploading ${i + 1}/${files.length}…`);
        urls.push(await uploadProductPhoto(product.id, files[i]!));
      }
      setUploadMsg(null);
      setFiles([]);
      // Multi only when the brand explicitly opted in AND actually gave a set.
      onGenerate(urls, multiAngle && urls.length >= 2 ? 'multi' : 'single');
    } catch (err) {
      setUploadMsg(null);
      setUploadErr(err instanceof ApiError ? err.message : 'Upload failed.');
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 items-center gap-2 px-5 py-3.5 sm:grid-cols-[1fr_auto_auto_auto] sm:gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{product.name}</p>
          <code className="font-mono text-xs text-muted">{product.slug}</code>
        </div>
        <span className="text-[14px] text-muted sm:text-center">{dims ?? '—'}</span>
        <StatusBadge status={product.status} />
        <button
          onClick={onToggle}
          className="justify-self-start rounded-[var(--radius)] border border-line px-2.5 py-1 text-[14px] font-medium text-ink hover:bg-surface-2 sm:justify-self-end"
        >
          {product.status === 'READY' ? 'Preview / Regenerate' : 'Generate'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-line bg-surface-2/40 px-5 py-4">
          {product.status === 'READY' && product.glbUrl && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onPreview(product.glbUrl!, product.name)}
                className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-brand px-3 py-1.5 text-[14px] font-medium text-brand-fg hover:bg-brand-hover"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 8l-9-5-9 5 9 5 9-5z" />
                  <path d="M3 8v8l9 5 9-5V8" />
                  <path d="M12 13v8" />
                </svg>
                View 3D model
              </button>
              {canShare && (
                <button
                  type="button"
                  onClick={onShare}
                  className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-1.5 text-[14px] font-medium text-ink hover:bg-surface-2"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
                  </svg>
                  Share link &amp; QR
                </button>
              )}
              <span className="text-xs text-muted">Rotate, zoom, or share a link/QR — shoppers view it in AR.</span>
            </div>
          )}
          {product.status === 'PROCESSING' ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Spinner className="text-brand" /> Generating the 3D model… (~90 seconds)
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[14px] font-medium text-ink">
                  Product photo — one sharp, high-resolution image works best
                </label>
                <p className="mt-1 text-xs text-muted">
                  Use the full-size product image from your store (not a thumbnail), on a plain
                  background. The AI intelligently fills in the sides you don&apos;t photograph.
                </p>
              </div>

              {files.length < 4 && (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line-2 bg-surface px-4 py-6 text-center transition-colors hover:border-brand/50">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <path d="M17 8l-5-5-5 5M12 3v13" />
                  </svg>
                  <span className="text-sm font-medium text-ink">
                    {files.length === 0 ? 'Click to choose photos' : 'Add another photo'}
                  </span>
                  <span className="text-xs text-muted">
                    JPEG, PNG, or WebP · {files.length}/4 added · max 12 MB each
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      pickFiles(e.target.files);
                      e.target.value = ''; // reset so the same file can be re-picked / added again
                    }}
                  />
                </label>
              )}

              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <div key={`${f.name}-${f.size}-${i}`} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(f)}
                        alt={f.name}
                        className="h-16 w-16 rounded-lg border border-line object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        aria-label={`Remove ${f.name}`}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-card hover:text-danger"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {files.length >= 2 && (
                <label className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={multiAngle}
                    onChange={(e) => setMultiAngle(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                  />
                  <span className="text-xs text-muted">
                    <span className="font-medium text-ink">These are matched angles of the same product</span>{' '}
                    (a clean turntable-style set — consistent distance &amp; lighting). We&apos;ll
                    reconstruct the real sides from all photos. Leave this off for casual or
                    mismatched shots — a single photo gives a cleaner model.
                  </span>
                </label>
              )}

              {uploadErr && <p className="text-xs text-danger">{uploadErr}</p>}

              <Button
                size="sm"
                onClick={uploadAndGenerate}
                loading={!!uploadMsg}
                className={cn(files.length === 0 && 'opacity-60')}
              >
                {uploadMsg ?? (product.status === 'READY' ? 'Upload & regenerate' : 'Generate 3D model')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
