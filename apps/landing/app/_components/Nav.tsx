import Image from 'next/image';
import Link from 'next/link';
import { DEMO_URL, ONBOARD } from '../_lib/site';

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy/70 backdrop-blur-md">
      <div className="container-wide flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="Rekaman home">
          <Image src="/brand/rekaman-icon.png" alt="" width={32} height={32} className="h-8 w-8" priority />
          <span className="text-[18px] font-semibold tracking-tight text-white">Rekaman</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-md px-3 py-2 text-[14px] font-medium text-navy-fg/80 hover:text-white">
              {l.label}
            </a>
          ))}
          <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="rounded-md px-3 py-2 text-[14px] font-medium text-navy-fg/80 hover:text-white">
            Live demo
          </a>
        </nav>
        <a href={ONBOARD} className="btn-primary px-4 py-2 text-[14px]">Book a demo</a>
      </div>
    </header>
  );
}
