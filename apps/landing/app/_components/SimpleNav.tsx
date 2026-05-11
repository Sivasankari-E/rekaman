import Link from 'next/link';

export function SimpleNav() {
  return (
    <header className="border-b border-border bg-bg-alt">
      <div className="container-wide flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Rekaman home">
          <svg viewBox="0 0 28 30" fill="none" className="w-6 h-6" aria-hidden>
            <g stroke="#5A4FCF" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
              <path d="M 14 2 L 26 9 L 26 21 L 14 28 L 2 21 L 2 9 Z" />
              <path d="M 14 2 L 14 14 L 26 21" />
              <path d="M 14 14 L 2 21" />
            </g>
          </svg>
          <span className="font-medium text-[18px] tracking-[-0.01em]">rekaman</span>
        </Link>
        <nav className="flex items-center gap-1 text-[13px] text-ink-muted">
          <Link href="/" className="px-3 py-1.5 hover:text-ink transition-colors">Home</Link>
          <Link href="/contact" className="px-3 py-1.5 hover:text-ink transition-colors">Contact</Link>
        </nav>
      </div>
    </header>
  );
}

export function SimpleFooter() {
  return (
    <footer className="border-t border-border bg-bg-alt mt-24">
      <div className="container-wide py-10">
        <div className="flex flex-wrap justify-between gap-6 text-[13px] text-ink-muted">
          <div>© 2026 Rekaman Spatial Private Limited (incorporation in progress) · Chennai</div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-ink transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-ink transition-colors">Terms</Link>
            <Link href="/refund" className="hover:text-ink transition-colors">Refund</Link>
            <Link href="/contact" className="hover:text-ink transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
