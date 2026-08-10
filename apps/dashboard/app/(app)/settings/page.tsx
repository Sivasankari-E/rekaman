'use client';

import { useEffect, useState } from 'react';
import { brand, ApiError, type BrandView, type ButtonStyle } from '../../_lib/api';
import { Button, Card, Input, Field, Alert, Spinner, cn } from '../../_components/ui';

const DEFAULT_COLOR = '#3b82f6';
const DEFAULT_LABEL = 'View in your room';
const RADIUS: Record<ButtonStyle, string> = { pill: '999px', rounded: '14px', square: '6px' };
const STYLES: ButtonStyle[] = ['pill', 'rounded', 'square'];

// WCAG-ish: white or near-black text for contrast on the chosen colour.
function contrastText(hex: string): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return '#ffffff';
  const lin = (h: string) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lin(m[1]!) + 0.7152 * lin(m[2]!) + 0.0722 * lin(m[3]!);
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? '#ffffff' : '#0f0f0f';
}

export default function SettingsPage() {
  const [data, setData] = useState<BrandView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [color, setColor] = useState(DEFAULT_COLOR);
  const [style, setStyle] = useState<ButtonStyle>('pill');
  const [label, setLabel] = useState('');

  useEffect(() => {
    brand
      .get()
      .then((b) => {
        setData(b);
        setColor(b.theme.primaryColor ?? DEFAULT_COLOR);
        setStyle(b.theme.buttonStyle ?? 'pill');
        setLabel(b.theme.buttonLabel ?? '');
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load settings.'));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const isDefaultColor = color.toLowerCase() === DEFAULT_COLOR;
      const b = await brand.updateTheme({
        primaryColor: isDefaultColor ? null : color,
        buttonStyle: style === 'pill' ? null : style,
        buttonLabel: label.trim() ? label.trim() : null,
      });
      setData(b);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  function resetDefaults() {
    setColor(DEFAULT_COLOR);
    setStyle('pill');
    setLabel('');
  }

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        {error ? <Alert>{error}</Alert> : <Spinner className="text-brand" />}
      </div>
    );
  }

  const textColor = contrastText(color);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">Your brand profile and AR button appearance.</p>
      </div>

      {error && <Alert>{error}</Alert>}

      {/* Profile */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink">Brand profile</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Brand name">
            <Input value={data.name} disabled />
          </Field>
          <Field label="Brand ID (slug)">
            <Input value={data.slug} disabled className="font-mono" />
          </Field>
        </div>
        <p className="mt-2 text-xs text-muted">Contact support to change your brand name.</p>
      </Card>

      {/* AR button branding */}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink">AR button appearance</h2>
        <p className="mt-1 text-[13px] text-muted">
          Match the “View in your room” button to your storefront. Leave defaults for the standard
          Rekaman look.
        </p>

        {/* live preview */}
        <div className="mt-4 flex items-center justify-center rounded-xl border border-line bg-surface-2 py-8">
          <span
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold shadow-card"
            style={{ background: color, color: textColor, borderRadius: RADIUS[style] }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7" />
              <path d="M3 7l9-4 9 4M12 11v8" />
            </svg>
            {label.trim() || DEFAULT_LABEL}
          </span>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Primary colour">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded-[var(--radius)] border border-line bg-surface p-1"
                aria-label="Primary colour"
              />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
            </div>
          </Field>

          <Field label="Button label">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={DEFAULT_LABEL}
              maxLength={40}
            />
          </Field>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Shape</label>
            <div className="inline-flex rounded-[var(--radius)] border border-line p-0.5">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={cn(
                    'rounded-[7px] px-4 py-1.5 text-[13px] font-medium capitalize transition-colors',
                    style === s ? 'bg-brand text-brand-fg' : 'text-muted hover:text-ink',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={save} loading={saving}>
            Save changes
          </Button>
          <Button variant="ghost" onClick={resetDefaults}>
            Reset to default
          </Button>
          {saved && <span className="text-[13px] font-medium text-success">Saved ✓</span>}
        </div>
      </Card>
    </div>
  );
}
