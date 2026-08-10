import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  alternates: { canonical: 'https://rekaman.io' },
};

const DEMO_URL = 'https://demo.rekaman.io/';
const ONBOARD = '/onboard';
const FOUNDER_EMAIL = 'founder@rekaman.io';
const WHATSAPP_E164 = '918248524449';
const WHATSAPP_DISPLAY = '+91 8248 524449';
const HERO_IMG =
  'https://rekaman-products-prod-975050270919-ap-south-1-an.s3.ap-south-1.amazonaws.com/demo-test/furniture-florence-table/02-angle.png';

export default function HomePage() {
  return (
    <main>
      <Nav />
      <Hero />
      <WorksOn />
      <Problem />
      <Solution />
      <Integration />
      <Pricing />
      <BookDemo />
      <Footer />
    </main>
  );
}

/* ── NAV ── */
function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/80 backdrop-blur-md">
      <div className="container-wide flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="Rekaman home">
          <Image src="/brand/rekaman-icon.png" alt="" width={32} height={32} className="h-8 w-8" priority />
          <span className="text-[18px] font-semibold tracking-tight text-ink">Rekaman</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <a href="#how" className="btn-ghost">How it works</a>
          <a href="#pricing" className="btn-ghost">Pricing</a>
          <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">Live demo</a>
        </nav>
        <a href={ONBOARD} className="btn-primary px-4 py-2 text-[14px]">Book a demo</a>
      </div>
    </header>
  );
}

/* ── HERO ── */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* soft brand glow, full-bleed so the sides never read as empty */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 0%, rgba(59,130,246,0.10) 0%, rgba(59,130,246,0) 70%)',
        }}
      />
      <div className="container-wide relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-subtle-pulse" />
            Spatial commerce for any store
          </span>
          <h1 className="h-hero mt-6 text-ink">
            Capture products.
            <br />
            <span className="text-brand">Place them anywhere.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted sm:text-[18px]">
            Add “View in your room” augmented reality to your product pages in minutes. Our AI turns
            your photos into 3D models — shoppers see products at real-world scale, on any device.{' '}
            <span className="font-semibold text-ink">No app. One line of code.</span>
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href={ONBOARD} className="btn-primary">Book a demo</a>
            <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              See it live →
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-faint">
            {['No app download', 'No 3D artists', 'Works on any store'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand" /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Product visual */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-brand/10 blur-2xl" aria-hidden />
          <div className="overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-pop">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={HERO_IMG} alt="A coffee table shown in AR" className="aspect-[4/3] w-full object-contain" />
            <div className="flex items-center justify-between gap-3 border-t border-line bg-surface px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">Florence Coffee Table</p>
                <p className="text-xs text-muted">86 × 37 cm · real-world scale</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg">
                <Cube className="h-3.5 w-3.5" /> View in your room
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── WORKS-ON strip ── */
function WorksOn() {
  const platforms = ['Shopify', 'WooCommerce', 'Magento', 'BigCommerce', 'Webflow', 'Wix', 'Custom sites'];
  return (
    <section className="border-y border-line bg-surface-2">
      <div className="container-wide py-8">
        <p className="text-center text-[12.5px] font-medium uppercase tracking-[0.1em] text-faint">
          Works on every store that can paste a script tag
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {platforms.map((p) => (
            <span key={p} className="text-[15px] font-semibold text-muted">{p}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── PROBLEM (dark) ── */
function Problem() {
  return (
    <section className="bg-navy text-navy-fg">
      <div className="container-wide py-20 lg:py-28">
        <p className="eyebrow text-brand">The problem</p>
        <h2 className="h-section mt-4 max-w-3xl text-white">
          Shoppers can’t tell if a product fits — so they buy, return, and don’t come back.
        </h2>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          <Stat n="25–30%" label="Return rate in Indian e-commerce" d="Furniture, decor, eyewear — mostly “it didn’t look/fit right.”" />
          <Stat n="₹2K–5K" label="Cost per return" d="Reverse logistics, restocking, refunds — your margin, gone." />
          <Stat n="3–4×" label="Conversion lift with AR" d="Shoppers who preview in their space add to cart far more often." />
        </div>
      </div>
    </section>
  );
}
function Stat({ n, label, d }: { n: string; label: string; d: string }) {
  return (
    <div>
      <div className="text-[52px] font-bold leading-none tracking-tight text-brand sm:text-[60px]">{n}</div>
      <div className="mt-3 text-[15px] font-semibold text-white">{label}</div>
      <p className="mt-1.5 text-[14px] leading-relaxed text-navy-muted">{d}</p>
    </div>
  );
}

/* ── SOLUTION ── */
function Solution() {
  const steps = [
    { n: '01', t: 'Upload your product photos', b: 'Even 1–4 photos from your catalog. No turntables, no studios, no 3D artists.' },
    { n: '02', t: 'AI generates 3D in ~90 seconds', b: 'We convert photos into a clean, optimized 3D model with real measurements baked in.' },
    { n: '03', t: 'Shoppers see it in their room', b: 'One script tag + one div. Shoppers tap, point their camera, and see it at real scale.' },
  ];
  return (
    <section id="how" className="bg-canvas">
      <div className="container-wide py-20 lg:py-28">
        <p className="eyebrow">How Rekaman works</p>
        <h2 className="h-section mt-4 max-w-2xl text-ink">Photos in. 3D out. On every shopper’s phone.</h2>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-line bg-surface p-7 shadow-card">
              <div className="text-[15px] font-bold text-brand">{s.n}</div>
              <h3 className="mt-3 text-[19px] font-semibold tracking-tight text-ink">{s.t}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{s.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── INTEGRATION ── */
function Integration() {
  return (
    <section className="border-y border-line bg-surface-2">
      <div className="container-wide py-20 lg:py-28">
        <p className="eyebrow">Integration</p>
        <h2 className="h-section mt-4 max-w-2xl text-ink">Two lines of code. Any product page.</h2>
        <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-xl bg-navy font-mono text-[13px] leading-relaxed text-navy-fg shadow-card">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-[12px] text-navy-muted">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
              <span className="ml-2">product page</span>
            </div>
            <pre className="overflow-x-auto px-5 py-5">
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
          </div>
          <div className="space-y-3">
            {[
              ['Shopify', 'Liquid · {{ product.handle }}'],
              ['WooCommerce', 'PHP · $product->get_slug()'],
              ['Custom site', 'React, Next.js, plain HTML'],
              ['No website?', 'Share a link or QR — no site needed'],
            ].map(([name, detail]) => (
              <div key={name} className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <div>
                  <div className="text-[15px] font-semibold text-ink">{name}</div>
                  <div className="mt-0.5 text-[13px] text-muted">{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── PRICING ── */
function Pricing() {
  return (
    <section id="pricing" className="bg-canvas">
      <div className="container-wide py-20 lg:py-28">
        <p className="eyebrow">Pricing</p>
        <h2 className="h-section mt-4 max-w-2xl text-ink">Simple pricing, made for Indian SMBs.</h2>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-muted">
          Every plan includes AI 3D generation, the SDK, multi-store support, and email support. No
          setup fees, cancel anytime.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <PriceCard
            name="Starter"
            price="₹3,999"
            period="/mo"
            tagline="For brands with up to 10 products"
            features={['10 products · 500 AR sessions/mo', 'AI 3D generation from photos', 'Placement AR', 'Basic analytics', 'Email support']}
          />
          <PriceCard
            name="Pro"
            price="₹12,999"
            period="/mo"
            tagline="For brands ready to scale"
            features={['50 products · 5,000 sessions/mo', 'Everything in Starter', 'Full analytics + ROI', 'Bulk CSV import', 'Priority support · 24h SLA']}
            highlighted
          />
          <PriceCard
            name="Enterprise"
            price="Custom"
            period=""
            tagline="For large catalogs & custom needs"
            features={['Unlimited products & sessions', 'All AR modes', 'White-label SDK + custom domain', 'Dedicated manager · SLA', 'SSO + audit logs']}
          />
        </div>
        <p className="mt-8 text-center text-[13px] text-faint">
          Annual plans get 2 months free · Prices exclude GST
        </p>
      </div>
    </section>
  );
}
function PriceCard({
  name, price, period, tagline, features, highlighted,
}: {
  name: string; price: string; period: string; tagline: string; features: string[]; highlighted?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-7 ${highlighted ? 'border-brand bg-navy text-white shadow-pop' : 'border-line bg-surface shadow-card'}`}>
      {highlighted && (
        <span className="inline-flex items-center rounded-full bg-brand/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand">
          Most popular
        </span>
      )}
      <h3 className={`mt-3 text-[20px] font-bold tracking-tight ${highlighted ? 'text-white' : 'text-ink'}`}>{name}</h3>
      <p className={`text-[13px] ${highlighted ? 'text-navy-muted' : 'text-muted'}`}>{tagline}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className={`text-[36px] font-bold tracking-tight ${highlighted ? 'text-white' : 'text-ink'}`}>{price}</span>
        <span className={`text-[14px] ${highlighted ? 'text-navy-muted' : 'text-muted'}`}>{period}</span>
      </div>
      <ul className="mt-6 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[14px]">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${highlighted ? 'text-brand' : 'text-brand'}`} />
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

/* ── BOOK A DEMO ── */
function BookDemo() {
  return (
    <section className="bg-canvas">
      <div className="container-wide pb-24 pt-4 lg:pb-32">
        <div className="overflow-hidden rounded-3xl bg-navy px-6 py-14 text-center sm:px-12">
          <h2 className="mx-auto max-w-2xl text-[30px] font-bold leading-tight tracking-tight text-white sm:text-[40px]">
            See your own products in AR — book a free demo.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-navy-muted">
            Tell us about your store and we’ll show you a live AR preview of your products, set up in
            minutes. Concierge onboarding for your first 5 products.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={ONBOARD} className="btn-primary">Book a demo — 60-second form</a>
            <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/10">
              See live demo
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[14px] text-navy-muted">
            <a href={`https://wa.me/${WHATSAPP_E164}`} target="_blank" rel="noopener noreferrer" className="hover:text-white">
              WhatsApp {WHATSAPP_DISPLAY}
            </a>
            <span className="text-navy-2">·</span>
            <a href={`mailto:${FOUNDER_EMAIL}`} className="hover:text-white">{FOUNDER_EMAIL}</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FOOTER ── */
function Footer() {
  return (
    <footer className="border-t border-line bg-surface-2">
      <div className="container-wide py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Image src="/brand/rekaman-icon.png" alt="" width={28} height={28} className="h-7 w-7" />
              <span className="text-[17px] font-semibold text-ink">Rekaman</span>
            </div>
            <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-muted">
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
            { label: 'WhatsApp', href: `https://wa.me/${WHATSAPP_E164}`, external: true },
            { label: 'LinkedIn', href: 'https://www.linkedin.com/company/rekaman', external: true },
          ]} />
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-[12.5px] text-faint">
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
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              target={l.external ? '_blank' : undefined}
              rel={l.external ? 'noopener noreferrer' : undefined}
              className="text-[14px] text-muted transition-colors hover:text-brand"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── icons ── */
function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M3 8.5L6.5 12L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Cube({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8M12 13v8" />
    </svg>
  );
}
