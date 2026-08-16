import { forwardRef } from 'react';

/** Tiny classname joiner — avoids a clsx dependency for this scaffold. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

// ── Button ────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius)] ' +
  'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:opacity-60 ' +
  'disabled:pointer-events-none';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-fg hover:bg-brand-hover active:bg-brand-active',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2',
  ghost: 'bg-transparent text-ink hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[14px]',
  md: 'h-10 px-4 text-sm',
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
  }
>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent',
        className,
      )}
    />
  );
}

// ── Input + Field ───────────────────────────────────────────────────────────

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-sm text-ink',
          'placeholder:text-faint focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/25',
          'disabled:opacity-60',
          className,
        )}
        {...rest}
      />
    );
  },
);

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[14px] font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface shadow-card',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  READY: 'bg-success/10 text-success',
  PROCESSING: 'bg-brand/10 text-brand',
  PENDING: 'bg-surface-2 text-muted',
  FAILED: 'bg-danger/10 text-danger',
  ARCHIVED: 'bg-surface-2 text-faint',
};
const STATUS_LABEL: Record<string, string> = {
  READY: 'Ready',
  PROCESSING: 'Generating…',
  PENDING: 'Not generated',
  FAILED: 'Failed',
  ARCHIVED: 'Archived',
};
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLE[status] ?? 'bg-surface-2 text-muted',
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-danger/30 bg-danger/5 px-3 py-2 text-[14px] text-danger">
      {children}
    </div>
  );
}
