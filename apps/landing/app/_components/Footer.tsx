import Image from 'next/image';
import { DEMO_URL, ONBOARD, FOUNDER_EMAIL, WA } from '../_lib/site';

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-navy-fg/80">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              target={l.external ? '_blank' : undefined}
              rel={l.external ? 'noopener noreferrer' : undefined}
              className="text-[14px] text-navy-fg/60 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-navy text-white">
      <div className="container-wide py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Image src="/brand/rekaman-icon.png" alt="" width={28} height={28} className="h-7 w-7" />
              <span className="text-[17px] font-semibold text-white">Rekaman</span>
            </div>
            <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-navy-fg/60">
              Spatial commerce for any e-commerce store. Built in Tamil Nadu.
            </p>
          </div>
          <FooterCol
            title="Product"
            links={[
              { label: 'Live demo', href: DEMO_URL, external: true },
              { label: 'How it works', href: '/#how' },
              { label: 'Pricing', href: '/#pricing' },
              { label: 'Book a demo', href: ONBOARD },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Refund Policy', href: '/refund' },
              { label: 'Contact', href: '/contact' },
            ]}
          />
          <FooterCol
            title="Connect"
            links={[
              { label: FOUNDER_EMAIL, href: `mailto:${FOUNDER_EMAIL}` },
              { label: 'WhatsApp', href: `https://wa.me/${WA}`, external: true },
              { label: 'LinkedIn', href: 'https://www.linkedin.com/company/rekaman', external: true },
            ]}
          />
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-[12.5px] text-navy-muted">
          <div>© 2026 Rekaman Spatial Private Limited · Tamil Nadu, India</div>
          <div>Capture products. Place them anywhere.</div>
        </div>
      </div>
    </footer>
  );
}
