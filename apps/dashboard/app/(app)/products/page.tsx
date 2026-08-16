'use client';

import { useEffect, useRef, useState } from 'react';
import {
  products,
  slugify,
  uploadProductPhoto,
  ApiError,
  type Product,
} from '../../_lib/api';
import { Button, Card, Input, Field, Alert, Spinner, StatusBadge, cn } from '../../_components/ui';
import { Model3DModal } from '../../_components/Model3DModal';

export default function ProductsPage() {
  const [list, setList] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ glbUrl: string; name: string } | null>(null);
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
            <p className="mt-1 text-[14px] text-muted">Add your first product to generate its 3D model.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {list.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                expanded={expanded === p.id}
                onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
                onPreview={(glbUrl, name) => setPreview({ glbUrl, name })}
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
        Tip: 2–4 clean angles (front, side, top) on a plain background produce the best 3D model.
        The generated model appears here when ready (~90s).
      </p>

      {preview && (
        <Model3DModal glbUrl={preview.glbUrl} name={preview.name} onClose={() => setPreview(null)} />
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
  expanded,
  onToggle,
  onPreview,
  onGenerate,
}: {
  product: Product;
  expanded: boolean;
  onToggle: () => void;
  onPreview: (glbUrl: string, name: string) => void;
  onGenerate: (urls: string[]) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
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
      onGenerate(urls);
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
              <span className="text-xs text-muted">Rotate, zoom, and (on a phone) place it in AR.</span>
            </div>
          )}
          {product.status === 'PROCESSING' ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Spinner className="text-brand" /> Generating the 3D model… (~90 seconds)
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-[14px] font-medium text-ink">
                Product photos — 1–4 angles (front, side, and top work best)
              </label>

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
