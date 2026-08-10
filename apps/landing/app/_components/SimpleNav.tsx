import Image from 'next/image';
import Link from 'next/link';

export function SimpleNav() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="container-wide flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="Rekaman home">
          <Image src="/brand/rekaman-icon.png" alt="" width={32} height={32} className="h-8 w-8" />
          <span className="text-[18px] font-semibold tracking-tight text-ink">Rekaman</span>
        </Link>
        <nav className="flex items-center gap-1 text-[13px] text-muted">
          <Link href="/" className="px-3 py-1.5 transition-colors hover:text-ink">Home</Link>
          <Link href="/contact" className="px-3 py-1.5 transition-colors hover:text-ink">Contact</Link>
        </nav>
      </div>
    </header>
  );
}

export function SimpleFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface-2">
      <div className="container-wide py-10">
        <div className="flex flex-wrap justify-between gap-6 text-[13px] text-muted">
          <div>© 2026 Rekaman Spatial Private Limited · Tamil Nadu, India</div>
          <div className="flex gap-6">
            <Link href="/privacy" className="transition-colors hover:text-ink">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-ink">Terms</Link>
            <Link href="/refund" className="transition-colors hover:text-ink">Refund</Link>
            <Link href="/contact" className="transition-colors hover:text-ink">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
