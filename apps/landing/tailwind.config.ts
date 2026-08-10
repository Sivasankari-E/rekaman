import type { Config } from 'tailwindcss';

/*
 * Semantic colours only — each maps to a CSS variable in globals.css (same
 * token model as the dashboard). Components never use raw palette values, so a
 * rebrand or dark theme is a one-file change. Palette: navy #111827 + blue
 * #3b82f6 (Rekaman, Aug 2026).
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--brand)',
          hover: 'var(--brand-hover)',
          soft: 'var(--brand-soft)',
          fg: 'var(--brand-fg)',
        },
        canvas: 'var(--canvas)',
        surface: { DEFAULT: 'var(--surface)', 2: 'var(--surface-2)' },
        navy: {
          DEFAULT: 'var(--navy)',
          2: 'var(--navy-2)',
          fg: 'var(--navy-fg)',
          muted: 'var(--navy-muted)',
        },
        ink: { DEFAULT: 'var(--ink)', muted: 'var(--muted)', faint: 'var(--faint)' },
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        line: { DEFAULT: 'var(--line)', 2: 'var(--line-2)' },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        // ── back-compat aliases (old v5.11 class names → new tokens) so the
        // legal pages (privacy/terms/refund/contact) keep working unchanged.
        bg: { DEFAULT: 'var(--canvas)', alt: 'var(--surface)', dark: 'var(--navy)' },
        accent: { DEFAULT: 'var(--brand)', light: 'var(--brand)', subtle: 'var(--brand-soft)' },
        border: { DEFAULT: 'var(--line)', subtle: 'var(--line)' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        // 'serif' aliased to Inter — the old design used Fraunces; keeping the
        // class name avoids touching every legal page.
        serif: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      maxWidth: {
        container: '1180px',
        prose: '720px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.06)',
        pop: '0 12px 40px rgba(16,24,40,0.12)',
      },
      keyframes: {
        'subtle-pulse': { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
      animation: { 'subtle-pulse': 'subtle-pulse 2.4s ease-in-out infinite' },
    },
  },
  plugins: [],
};

export default config;
