import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Rekaman brand system (locked in CLAUDE.md v5.11 Brand Identity section)
        ink: {
          DEFAULT: '#0F0F0F',
          muted: '#6B6B6B',
          faint: '#A0A0A0',
        },
        bg: {
          DEFAULT: '#FAFAF7', // warm white
          alt: '#FFFFFF',
          dark: '#0F0F0F',
        },
        accent: {
          DEFAULT: '#5A4FCF',
          light: '#8B7FFF',
          subtle: '#EFEDFB',
        },
        border: {
          DEFAULT: '#E8E5DE',
          subtle: '#F1EFE9',
        },
        success: '#2F7D4F',
        warning: '#E0A030',
        danger: '#D4493B',
      },
      fontFamily: {
        // Loaded via next/font in app/layout.tsx with CSS variables
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      maxWidth: {
        container: '1200px',
        prose: '720px',
      },
      animation: {
        'subtle-pulse': 'subtle-pulse 3s ease-in-out infinite',
      },
      keyframes: {
        'subtle-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
