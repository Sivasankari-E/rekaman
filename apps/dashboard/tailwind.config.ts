import type { Config } from 'tailwindcss';

/*
 * Semantic colours only — each maps to a CSS variable defined in globals.css.
 * Components NEVER use raw palette values (no `bg-blue-500`); they use these
 * intent-named tokens (`bg-brand`, `text-ink`, `border-line`, `bg-sidebar`),
 * so a rebrand or dark theme is a one-file change in globals.css.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--brand)',
          hover: 'var(--brand-hover)',
          active: 'var(--brand-active)',
          fg: 'var(--brand-fg)',
          soft: 'var(--brand-soft)',
        },
        canvas: 'var(--canvas)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          2: 'var(--sidebar-2)',
          fg: 'var(--sidebar-fg)',
          muted: 'var(--sidebar-muted)',
        },
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        line: {
          DEFAULT: 'var(--line)',
          2: 'var(--line-2)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      // Enlarged for readability (Aug 2026): xs 12→13, sm 14→15, base 15→16.
      // Overriding here lifts every text-xs/text-sm/text-base usage at once,
      // so the UI reads less cramped without touching each component. Heading
      // sizes (lg/xl/2xl/3xl) keep Tailwind defaults.
      fontSize: {
        xs: ['13px', { lineHeight: '1.45' }],
        sm: ['15px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.6' }],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
      maxWidth: {
        container: '1200px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
        pop: '0 4px 12px rgba(16,24,40,0.10), 0 2px 4px rgba(16,24,40,0.06)',
      },
      ringColor: {
        brand: 'var(--ring)',
      },
    },
  },
  plugins: [],
};

export default config;
