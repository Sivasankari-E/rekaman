import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Hero3D } from './_components/Hero3D';
import { Reveal } from './_components/Reveal';

export const metadata: Metadata = {
  alternates: { canonical: 'https://rekaman.io' },
};

const DEMO_URL = 'https://demo.rekaman.io/';
const ONBOARD = '/onboard';
const FOUNDER_EMAIL = 'founder@rekaman.io';
const WA = '918248524449';
const WA_DISPLAY = '+91 8248 524449';

export default function HomePage() {
  return (
    <main>
      <TopDark />
      <Problem />
      <Features />
      <HowItWorks />
      <Pricing />
      <BookDemo />
      <Footer />
    </main>
  );
}

/* ─────────────── DARK BLOCK: nav + hero + works-on ─────────────── */
function TopDark() {
  return (
    <div className="relative overflow-hidden bg-navy text-white">
      <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-60" aria-hidden />
      <div
        aria-hidden
        className="animate-float-slow pointer-events-none absolute inset-x-0 -top-40 h-[560px]"
        style={{ background: 'radial-gradient(46% 46% at 62% 30%, rgba(59,130,246,0.22), transparent 72%)' }}
      />
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-navy/70 backdrop-blur-md">
        <div className="container-wide flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="Rekaman home">
            <Image src="/brand/rekaman-icon.png" alt="" width={32} height={32} className="h-8 w-8" priority />
            <span className="text-[18px] font-semibold tracking-tight text-white">Rekaman</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <a href="#how" className="rounded-md px-3 py-2 text-[14px] font-medium text-navy-fg/80 hover:text-white">How it works</a>
            <a href="#pricing" className="rounded-md px-3 py-2 text-[14px] font-medium text-navy-fg/80 hover:text-white">Pricing</a>
            <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="rounded-md px-3 py-2 text-[14px] font-medium text-navy-fg/80 hover:text-white">Live demo</a>
          </nav>
          <a href={ONBOARD} className="btn-primary px-4 py-2 text-[14px]">Book a demo</a>
        </div>
      </header>

      {/* Hero */}
      <section className="container-wide relative grid items-center gap-14 pb-14 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[12.5px] font-medium text-navy-fg">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-subtle-pulse" />
            Spatial commerce for any store
          </span>
          <h1 className="mt-6 text-[40px] font-extrabold leading-[1.05] tracking-[-0.03em] text-white sm:text-[56px] lg:text-[64px]">
            Capture products.
            <br />
            <span className="text-gradient">Place them anywhere.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-navy-fg/80 sm:text-[18px]">
            Add “View in your room” AR to your product pages in minutes. Our AI turns your photos
            into 3D models — shoppers see products at real-world scale, on any device.{' '}
            <span className="font-semibold text-white">No app. One line of code.</span>
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href={ONBOARD} className="btn-primary">Book a demo</a>
            <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/10">
              See it live →
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-navy-muted">
            {['No app download', 'No 3D artists', 'Works on any store'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand" /> {t}
              </span>
            ))}
          </div>
        </div>
        <div className="animate-fade-up [animation-delay:120ms]">
          <Hero3D />
        </div>
      </section>

      {/* Works-on strip */}
      <div className="relative border-t border-white/10">
        <div className="container-wide flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-7">
          <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-navy-muted">Works on</span>
          {['Shopify', 'WooCommerce', 'Magento', 'BigCommerce', 'Webflow', 'Wix', 'Custom'].map((p) => (
            <span key={p} className="text-[15px] font-semibold text-navy-fg/70">{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── PROBLEM ─────────────── */
function Problem() {
  const stats = [
    ['25–30%', 'Return rate in Indian e-commerce', 'Furniture, decor, eyewear — mostly “it didn’t look or fit right.”'],
    ['₹2K–5K', 'Cost per return', 'Reverse logistics, restocking, refunds — your margin, gone.'],
    ['3–4×', 'Conversion lift with AR', 'Shoppers who preview in their own space add to cart far more often.'],
  ];
  return (
    <section className="bg-canvas">
      <div className="container-wide py-16 lg:py-24">
        <Reveal>
          <p className="eyebrow">The problem</p>
          <h2 className="mt-3 max-w-3xl text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[38px]">
            Shoppers can’t tell if a product fits — so they buy, return, and don’t come back.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {stats.map(([n, label, d], i) => (
            <Reveal key={label} delay={i * 90}>
              <div className="h-full rounded-2xl border border-line bg-surface p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-pop">
                <div className="text-[44px] font-extrabold leading-none tracking-tight text-brand">{n}</div>
                <div className="mt-3 text-[15px] font-semibold text-ink">{label}</div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── FEATURES (bento) ─────────────── */
function Features() {
  return (
    <section className="border-y border-line bg-surface-2">
      <div className="container-wide py-16 lg:py-24">
        <Reveal>
          <p className="eyebrow">Why Rekaman</p>
          <h2 className="mt-3 max-w-2xl text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[38px]">
            Everything you need to sell in 3D — nothing you don’t.
          </h2>
        </Reveal>

        <Reveal delay={80} className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Big: real scale */}
          <Bento className="lg:col-span-2 lg:row-span-1" icon={<IcScale />} title="True-to-life scale">
            Models render at their exact real-world size, so an 86 cm table is 86 cm on the
            shopper’s floor. That’s the whole point — no more “it looked bigger online.”
          </Bento>
          <Bento icon={<IcDevices />} title="Every device">
            iOS AR Quick Look, Android WebXR, and a 3D viewer on desktop — one integration.
          </Bento>
          <Bento icon={<IcBolt />} title="3D in ~90 seconds">
            Upload photos, our AI returns a clean, optimized model. No studios, no artists.
          </Bento>
          <Bento icon={<IcQr />} title="No website? No problem">
            Share a hosted link or QR for WhatsApp, Instagram, or packaging — no site needed.
          </Bento>
          <Bento icon={<IcCode />} title="One line of code">
            A script tag and a div. Works on Shopify, WooCommerce, or any custom store.
          </Bento>
          {/* Wide: built for India */}
          <Bento className="lg:col-span-3" icon={<IcGlobe />} title="Built for India">
            WhatsApp-native sharing, regional-language UI, UPI-friendly billing, and a low-end
            Android fallback — the things global tools won’t build, from a founder you can reach on
            WhatsApp.
          </Bento>
        </Reveal>
      </div>
    </section>
  );
}
function Bento({ title, children, icon, className = '' }: { title: string; children: React.ReactNode; icon: React.ReactNode; className?: string }) {
  return (
    <div className={`group rounded-2xl border border-line bg-surface p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-pop ${className}`}>
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand transition-transform duration-200 group-hover:scale-110">{icon}</span>
      <h3 className="mt-4 text-[18px] font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mt-1.5 max-w-xl text-[14.5px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}

/* ─────────────── HOW IT WORKS (dark, with code) ─────────────── */
function HowItWorks() {
  const steps = [
    ['01', 'Upload photos', 'Even 1–4 photos from your catalog — front, side, top.'],
    ['02', 'AI generates 3D', 'A clean, optimized model with real measurements, in ~90 seconds.'],
    ['03', 'Shoppers place it', 'They tap, point their camera, and see it at real scale.'],
  ];
  return (
    <section id="how" className="relative overflow-hidden bg-navy text-white">
      <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-50" aria-hidden />
      <div
        aria-hidden
        className="animate-float-slow pointer-events-none absolute -right-24 top-0 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(50% 50% at 50% 50%, rgba(59,130,246,0.18), transparent 70%)' }}
      />
      <div className="container-wide relative py-16 lg:py-24">
        <Reveal>
          <p className="eyebrow text-brand">How it works</p>
          <h2 className="mt-3 max-w-2xl text-[28px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[38px]">
            Photos in. 3D out. Two lines of code.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal className="space-y-6">
            {steps.map(([n, t, d]) => (
              <div key={n} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[13px] font-bold text-brand">{n}</span>
                <div>
                  <h3 className="text-[17px] font-semibold text-white">{t}</h3>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-navy-fg/70">{d}</p>
                </div>
              </div>
            ))}
          </Reveal>

          <Reveal delay={120} className="overflow-hidden rounded-xl border border-white/10 bg-black/30 font-mono text-[13px] leading-relaxed shadow-pop">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-[12px] text-navy-muted">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
              <span className="ml-2">product page</span>
            </div>
            <pre className="overflow-x-auto px-5 py-5 text-navy-fg">
              <code>
                <span className="text-navy-muted">{'<!-- 1. Add once, before </body> -->'}</span>
                {'\n'}
                <span className="text-[#93c5fd]">{'<script'}</span> src=
                <span className="text-[#86efac]">&quot;https://cdn.rekaman.io/v1/sdk.js&quot;</span> defer
                <span className="text-[#93c5fd]">{'></script>'}</span>
                {'\n\n'}
                <span className="text-navy-muted">{'<!-- 2. Add to each product page -->'}</span>
                {'\n'}
                <span className="text-[#93c5fd]">{'<div'}</span> data-rk-product=
                <span className="text-[#86efac]">&quot;&#123;&#123; product.handle &#125;&#125;&quot;</span>
                {'\n     '}data-rk-key=<span className="text-[#86efac]">&quot;rk_live_xxx&quot;</span>
                <span className="text-[#93c5fd]">{'></div>'}</span>
              </code>
            </pre>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── PRICING ─────────────── */
function Pricing() {
  return (
    <section id="pricing" className="bg-canvas">
      <div className="container-wide py-16 lg:py-24">
        <Reveal>
          <p className="eyebrow">Pricing</p>
          <h2 className="mt-3 max-w-2xl text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[38px]">
            Simple pricing, made for Indian SMBs.
          </h2>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-muted">
            Every plan includes AI 3D generation, the SDK, multi-store support, and email support. No
            setup fees, cancel anytime.
          </p>
        </Reveal>
        <div className="mt-12 grid items-stretch gap-6 md:grid-cols-3">
          <Reveal delay={0} className="h-full"><Price name="Starter" price="₹3,999" period="/mo" tagline="Up to 10 products" features={['10 products · 500 AR sessions/mo', 'AI 3D generation', 'Placement AR', 'Basic analytics', 'Email support']} /></Reveal>
          <Reveal delay={90} className="h-full"><Price name="Pro" price="₹12,999" period="/mo" tagline="For brands ready to scale" features={['50 products · 5,000 sessions/mo', 'Everything in Starter', 'Full analytics + ROI', 'Bulk CSV import', 'Priority support · 24h SLA']} highlighted /></Reveal>
          <Reveal delay={180} className="h-full"><Price name="Enterprise" price="Custom" period="" tagline="Large catalogs & custom needs" features={['Unlimited products & sessions', 'All AR modes', 'White-label + custom domain', 'Dedicated manager · SLA', 'SSO + audit logs']} /></Reveal>
        </div>
        <p className="mt-8 text-center text-[13px] text-faint">Annual plans get 2 months free · Prices exclude GST</p>
      </div>
    </section>
  );
}
function Price({ name, price, period, tagline, features, highlighted }: { name: string; price: string; period: string; tagline: string; features: string[]; highlighted?: boolean }) {
  return (
    <div className={`relative flex h-full flex-col rounded-2xl border p-7 transition-all duration-200 ${highlighted ? 'border-brand bg-navy text-white shadow-pop lg:-translate-y-2' : 'border-line bg-surface shadow-card hover:-translate-y-1 hover:border-brand/40 hover:shadow-pop'}`}>
      {highlighted && (
        <span className="absolute right-6 top-6 rounded-full bg-brand/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand">Popular</span>
      )}
      <h3 className={`text-[20px] font-bold tracking-tight ${highlighted ? 'text-white' : 'text-ink'}`}>{name}</h3>
      <p className={`text-[13px] ${highlighted ? 'text-navy-muted' : 'text-muted'}`}>{tagline}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className={`text-[36px] font-extrabold tracking-tight ${highlighted ? 'text-white' : 'text-ink'}`}>{price}</span>
        <span className={`text-[14px] ${highlighted ? 'text-navy-muted' : 'text-muted'}`}>{period}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[14px]">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <span className={highlighted ? 'text-navy-fg' : 'text-muted'}>{f}</span>
          </li>
        ))}
      </ul>
      <a href={ONBOARD} className={`mt-7 w-full ${highlighted ? 'btn-primary' : 'btn-secondary'}`}>
        {name === 'Enterprise' ? 'Contact sales' : 'Book a demo'}
      </a>
    </div>
  );
}

/* ─────────────── BOOK A DEMO ─────────────── */
function BookDemo() {
  return (
    <section className="bg-canvas">
      <div className="container-wide pb-20 pt-2 lg:pb-28">
        <Reveal className="relative overflow-hidden rounded-[2rem] bg-navy px-6 py-16 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-50" aria-hidden />
          <div aria-hidden className="animate-float-slow pointer-events-none absolute inset-x-0 top-0 h-64" style={{ background: 'radial-gradient(50% 60% at 50% 0%, rgba(59,130,246,0.3), transparent 70%)' }} />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-[30px] font-extrabold leading-tight tracking-[-0.02em] text-white sm:text-[42px]">
              See your products in AR — book a free demo.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-navy-fg/70">
              Tell us about your store and we’ll show a live AR preview of your products. Concierge
              setup for your first 5 — live within days.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={ONBOARD} className="btn-primary">Book a demo — 60-second form</a>
              <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/10">
                See live demo
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[14px] text-navy-muted">
              <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer" className="hover:text-white">WhatsApp {WA_DISPLAY}</a>
              <span className="text-white/20">·</span>
              <a href={`mailto:${FOUNDER_EMAIL}`} className="hover:text-white">{FOUNDER_EMAIL}</a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────── FOOTER ─────────────── */
function Footer() {
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
          <FooterCol title="Product" links={[
            { label: 'Live demo', href: DEMO_URL, external: true },
            { label: 'How it works', href: '/#how' },
            { label: 'Pricing', href: '/#pricing' },
            { label: 'Book a demo', href: ONBOARD },
          ]} />
          <FooterCol title="Legal" links={[
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
            { label: 'Refund Policy', href: '/refund' },
            { label: 'Contact', href: '/contact' },
          ]} />
          <FooterCol title="Connect" links={[
            { label: FOUNDER_EMAIL, href: `mailto:${FOUNDER_EMAIL}` },
            { label: 'WhatsApp', href: `https://wa.me/${WA}`, external: true },
            { label: 'LinkedIn', href: 'https://www.linkedin.com/company/rekaman', external: true },
          ]} />
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-[12.5px] text-navy-muted">
          <div>© 2026 Rekaman Spatial Private Limited · Tamil Nadu, India</div>
          <div>Capture products. Place them anywhere.</div>
        </div>
      </div>
    </footer>
  );
}
function FooterCol({ title, links }: { title: string; links: { label: string; href: string; external?: boolean }[] }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-navy-fg/80">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} target={l.external ? '_blank' : undefined} rel={l.external ? 'noopener noreferrer' : undefined} className="text-[14px] text-navy-fg/60 transition-colors hover:text-white">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────── icons ─────────────── */
function Check({ className }: { className?: string }) {
  return <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden><path d="M3 8.5L6.5 12L13 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function I({ children }: { children: React.ReactNode }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>;
}
function IcScale() { return <I><path d="M12 3v18M5 8l-3 5a3 3 0 006 0l-3-5zM19 8l-3 5a3 3 0 006 0l-3-5zM7 21h10M5 6h4l3-2 3 2h4" /></I>; }
function IcDevices() { return <I><rect x="2" y="4" width="14" height="10" rx="1.5" /><path d="M2 18h14" /><rect x="17" y="9" width="5" height="11" rx="1.2" /></I>; }
function IcBolt() { return <I><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></I>; }
function IcQr() { return <I><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M20 14v0M17 20h4M21 17v4" /></I>; }
function IcCode() { return <I><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></I>; }
function IcGlobe() { return <I><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" /></I>; }
