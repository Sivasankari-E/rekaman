import { Logo } from '../_components/Logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <div className="mb-auto">
          <Logo />
        </div>
        <main className="mx-auto w-full max-w-sm py-10">{children}</main>
        <p className="mt-auto text-xs text-faint">
          © 2026 Rekaman Spatial Private Limited · Built in Tamil Nadu
        </p>
      </div>

      {/* Brand side (desktop only) */}
      <div className="relative hidden overflow-hidden bg-sidebar lg:flex lg:flex-col lg:justify-center lg:px-14">
        {/* soft brand glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-30 blur-3xl"
          style={{ background: 'var(--brand)' }}
        />
        <div className="relative">
          <Logo tone="onDark" size="lg" />
          <h2 className="mt-8 max-w-md text-3xl font-semibold leading-tight text-white">
            AR for your product pages — in minutes, not months.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-sidebar-muted">
            Upload photos, our AI builds the 3D model, and shoppers see your products in their
            room. Works on any store, no app download.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              'Photos → 3D model in ~90 seconds',
              '“View in your room” on any device',
              'One line of code, or a shareable link',
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-sidebar-fg">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/20 text-brand">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
