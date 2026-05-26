import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  alternates: { canonical: 'https://rekaman.io' },
};

const DEMO_URL = 'https://demo.rekaman.io/';
const FOUNDER_EMAIL = 'founder@rekaman.io';
const WHATSAPP_E164 = '+918248524449';
const WHATSAPP_DISPLAY = '+91 8248 524449';

export default function HomePage() {
  return (
    <main>
      <Nav />
      <Hero />
      <Problem />
      <Solution />
      <HowItWorks />
      <Pricing />
      <Trust />
      <FinalCTA />
      <Footer />
    </main>
  );
}

/* ============================================================
   NAV
============================================================ */
function Nav() {
  return (
    <header className="border-b border-border bg-bg-alt/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container-wide flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Rekaman home">
          <Cube className="w-6 h-6" />
          <span className="font-medium text-[18px] tracking-[-0.01em]">rekaman</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          <a href="#how" className="btn-ghost">How it works</a>
          <a href="#pricing" className="btn-ghost">Pricing</a>
          <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">
            Demo
          </a>
        </nav>
        {/* Primary nav CTA → /onboard (redirects to the Brand Onboarding
            Google Form). A 60-second structured lead-capture form converts
            better than a raw mailto: — it auto-notifies the founder + lands
            the lead in the tracking Sheet. Always visible in the sticky
            header so the form is discoverable from any scroll position. */}
        <a href="/onboard" className="btn-primary text-[14px] px-4 py-2">
          Get started
        </a>
      </div>
    </header>
  );
}

/* ============================================================
   HERO
============================================================ */
function Hero() {
  return (
    <section className="relative pt-20 pb-24 md:pt-32 md:pb-32 overflow-hidden">
      <div className="container-wide relative">
        <div className="max-w-[860px]">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-subtle text-accent text-[12.5px] font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-subtle-pulse" />
            Spatial commerce for any brand
          </div>

          <h1 className="h-display text-[44px] md:text-[68px] lg:text-[80px] mb-6">
            Capture products.
            <br />
            <span className="text-accent">Place them anywhere.</span>
          </h1>

          <p className="text-[18px] md:text-[20px] text-ink-muted leading-[1.55] max-w-[640px] mb-10">
            Add &ldquo;View in your room&rdquo; augmented reality to your product pages in
            20 minutes. AI generates 3D models from your photos. Works on Shopify,
            WooCommerce, and any custom store. <span className="text-ink font-medium">One line of code.</span>
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-10">
            <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="btn-accent">
              See live demo →
            </a>
            <a href="#how" className="btn-secondary">How it works</a>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ink-faint">
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> No app download
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> No 3D artists needed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> No platform lock-in
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   PROBLEM
============================================================ */
function Problem() {
  return (
    <section className="py-20 md:py-28 bg-ink text-bg-alt">
      <div className="container-wide">
        <p className="eyebrow text-bg-alt/60 mb-6">The problem</p>
        <h2 className="h-section text-bg-alt mb-8 max-w-[820px]">
          Your customers can&rsquo;t tell if a product fits — so they buy, return,
          and tell their friends not to.
        </h2>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12 mt-16">
          <Stat number="25–30%" label="Return rate on Indian e-commerce" detail="Furniture, decor, apparel — driven almost entirely by &ldquo;it didn&rsquo;t fit / look right.&rdquo;" />
          <Stat number="₹2K–₹5K" label="Cost per return" detail="Reverse logistics, restocking, refunds, lost shipping. Your margin disappears." />
          <Stat number="3–4×" label="Conversion lift with AR" detail="Independent retailers report 3–4× higher add-to-cart rates when shoppers preview in their actual space." />
        </div>
      </div>
    </section>
  );
}

function Stat({ number, label, detail }: { number: string; label: string; detail: string }) {
  return (
    <div>
      <div className="font-serif text-[56px] md:text-[64px] leading-none tracking-[-0.02em] text-accent-light mb-3">{number}</div>
      <div className="text-[15px] font-medium mb-2">{label}</div>
      <p className="text-[14px] text-bg-alt/60 leading-relaxed">{detail}</p>
    </div>
  );
}

/* ============================================================
   SOLUTION
============================================================ */
function Solution() {
  return (
    <section className="py-20 md:py-28">
      <div className="container-wide">
        <p className="eyebrow mb-6">How Rekaman fixes it</p>
        <h2 className="h-section mb-16 max-w-[800px]">
          Photos in. 3D out. Real-world scale on every shopper&rsquo;s phone.
        </h2>

        <div className="grid md:grid-cols-3 gap-8 md:gap-6">
          <SolutionStep
            num="01"
            title="Upload your product photos"
            body="Even a single photo from your existing catalog. No turntables, no studios, no 3D artists. Multiple angles improve quality but aren't required."
          />
          <SolutionStep
            num="02"
            title="AI generates 3D in 90 seconds"
            body="Meshy.ai converts your photos into a clean glTF model. Real measurements baked in. We handle textures, geometry, optimization — you handle nothing."
          />
          <SolutionStep
            num="03"
            title="Shoppers see it in their room"
            body="One <script> tag, one <div> on your product page. Shoppers tap, point their camera, and see your product at real-world scale. No app. No friction."
          />
        </div>
      </div>
    </section>
  );
}

function SolutionStep({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="bg-bg-alt rounded-2xl border border-border p-8 transition-shadow hover:shadow-sm">
      <div className="font-serif text-accent text-[36px] mb-4 leading-none">{num}</div>
      <h3 className="h-card mb-3">{title}</h3>
      <p className="text-[14.5px] text-ink-muted leading-[1.7]">{body}</p>
    </div>
  );
}

/* ============================================================
   HOW IT WORKS — code snippet
============================================================ */
function HowItWorks() {
  return (
    <section id="how" className="py-20 md:py-28 bg-bg-alt border-y border-border">
      <div className="container-wide">
        <p className="eyebrow mb-6">Integration</p>
        <h2 className="h-section mb-6 max-w-[800px]">
          Two lines of code.<br />Every product page. Every store.
        </h2>
        <p className="text-[17px] text-ink-muted max-w-[640px] mb-12 leading-relaxed">
          You add this once globally, and one tag per product page. The SDK reads the
          product slug, fetches the matching 3D model, and injects the &ldquo;View in your room&rdquo; button.
        </p>

        <div className="grid lg:grid-cols-[1fr_400px] gap-12 items-start">
          <div className="rounded-xl bg-ink text-bg-alt overflow-hidden font-mono text-[13.5px] leading-[1.7]">
            <div className="px-5 py-3 bg-white/[0.04] border-b border-white/10 flex items-center gap-2 text-[12px] text-bg-alt/60">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              <span className="ml-3">product-template.liquid · Shopify</span>
            </div>
            <pre className="px-5 py-6 overflow-x-auto"><code>
              <span className="text-bg-alt/40">{'{% comment %} Step 1: Add once before </body> in theme.liquid {% endcomment %}'}</span>
              {'\n'}
              <span className="text-[#A78BFA]">{'<script'}</span>
              {' '}
              <span className="text-[#7DD3FC]">src</span>
              {'='}
              <span className="text-[#86EFAC]">&quot;https://cdn.rekaman.io/v1/sdk.js&quot;</span>
              {' '}
              <span className="text-[#7DD3FC]">defer</span>
              <span className="text-[#A78BFA]">{'></script>'}</span>
              {'\n\n'}
              <span className="text-bg-alt/40">{'{% comment %} Step 2: Add to each product page {% endcomment %}'}</span>
              {'\n'}
              <span className="text-[#A78BFA]">{'<div'}</span>
              {' '}
              <span className="text-[#7DD3FC]">data-rk-product</span>
              {'='}
              <span className="text-[#86EFAC]">&quot;&#123;&#123; product.handle &#125;&#125;&quot;</span>
              {'\n     '}
              <span className="text-[#7DD3FC]">data-rk-key</span>
              {'='}
              <span className="text-[#86EFAC]">&quot;rk_live_xxx&quot;</span>
              <span className="text-[#A78BFA]">{'></div>'}</span>
              {'\n\n'}
              <span className="text-bg-alt/40">{`# That's it. The SDK handles the rest:
# • detects iOS Quick Look vs Android WebXR
# • injects the "View in your room" button
# • loads the right 3D model per product
# • renders at real-world scale`}</span>
            </code></pre>
          </div>

          <div className="space-y-5">
            <PlatformPill name="Shopify" detail="Liquid · {{ product.handle }}" />
            <PlatformPill name="WooCommerce" detail="PHP · $product->get_slug()" />
            <PlatformPill name="Custom site" detail="React, Next.js, plain HTML — anything" />
            <PlatformPill name="Magento, BigCommerce, Webflow, Wix" detail="If you can paste a script tag, you can ship Rekaman" />
          </div>
        </div>
      </div>
    </section>
  );
}

function PlatformPill({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-bg">
      <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
      <div>
        <div className="font-medium text-[15px]">{name}</div>
        <div className="text-[13px] text-ink-muted mt-0.5">{detail}</div>
      </div>
    </div>
  );
}

/* ============================================================
   PRICING
============================================================ */
function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-28">
      <div className="container-wide">
        <p className="eyebrow mb-6">Pricing</p>
        <h2 className="h-section mb-6 max-w-[800px]">
          Pay-as-you-grow. Made for Indian SMB e-commerce.
        </h2>
        <p className="text-[17px] text-ink-muted max-w-[640px] mb-16 leading-relaxed">
          All plans include AI 3D generation, the SDK, multi-store support, and email
          support. No setup fees, no platform commissions, cancel anytime.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <PricingCard
            name="Starter"
            price="₹3,999"
            period="/month"
            tagline="For brands with up to 10 products"
            features={[
              { ok: true, text: '10 products · 500 AR sessions/month' },
              { ok: true, text: 'AI 3D generation from photos' },
              { ok: true, text: 'Placement AR (furniture, decor, electronics)' },
              { ok: true, text: 'Basic analytics dashboard' },
              { ok: true, text: 'Email support' },
              { ok: false, text: 'Try-on AR (face / wrist / hand)' },
              { ok: false, text: 'Multi-product scenes' },
              { ok: false, text: 'White-label SDK' },
            ]}
            cta="Start with Starter"
            highlighted={false}
          />
          <PricingCard
            name="Pro"
            price="₹12,999"
            period="/month"
            tagline="For brands ready to scale"
            features={[
              { ok: true, text: '50 products · 5,000 AR sessions/month' },
              { ok: true, text: 'AI 3D generation from photos' },
              { ok: true, text: 'Placement AR + Face try-on (Phase 3)' },
              { ok: true, text: 'Full analytics + ROI tracking' },
              { ok: true, text: 'WhatsApp integration (Phase 2)' },
              { ok: true, text: 'Bulk CSV import' },
              { ok: true, text: 'Priority email support · 24h SLA' },
              { ok: false, text: 'Dedicated account manager' },
            ]}
            cta="Start with Pro"
            highlighted={true}
          />
          <PricingCard
            name="Enterprise"
            price="Custom"
            period=""
            tagline="For large catalogs and custom AR needs"
            features={[
              { ok: true, text: 'Unlimited products · unlimited sessions' },
              { ok: true, text: 'All AR modes (incl. AI photo try-on, Phase 4)' },
              { ok: true, text: 'White-label SDK + custom domain' },
              { ok: true, text: 'Dedicated account manager' },
              { ok: true, text: 'Custom 99.9% uptime SLA' },
              { ok: true, text: 'SAML SSO + audit logs' },
              { ok: true, text: 'On-call support · 1h SLA' },
              { ok: true, text: 'Volume discount on AI generation' },
            ]}
            cta="Contact sales"
            highlighted={false}
          />
        </div>

        <p className="text-center text-[13px] text-ink-faint mt-10">
          Annual plans get 2 months free · Add-ons available · All prices exclude GST
        </p>
      </div>
    </section>
  );
}

function PricingCard({
  name, price, period, tagline, features, cta, highlighted,
}: {
  name: string; price: string; period: string; tagline: string;
  features: { ok: boolean; text: string }[];
  cta: string; highlighted: boolean;
}) {
  return (
    <div className={`rounded-2xl p-8 border ${highlighted ? 'bg-ink text-bg-alt border-ink shadow-xl' : 'bg-bg-alt border-border'}`}>
      {highlighted && (
        <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-accent/20 text-accent-light text-[11px] font-medium uppercase tracking-wider mb-4">
          Most popular
        </div>
      )}
      <h3 className={`font-serif font-medium text-[26px] mb-1 ${highlighted ? 'text-bg-alt' : 'text-ink'}`}>{name}</h3>
      <p className={`text-[13.5px] mb-6 ${highlighted ? 'text-bg-alt/60' : 'text-ink-muted'}`}>{tagline}</p>
      <div className="mb-8 flex items-baseline gap-1">
        <span className={`font-serif text-[40px] font-medium ${highlighted ? 'text-bg-alt' : 'text-ink'}`}>{price}</span>
        <span className={`text-[14px] ${highlighted ? 'text-bg-alt/60' : 'text-ink-muted'}`}>{period}</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((f, i) => (
          <li key={i} className={`flex items-start gap-3 text-[14px] leading-snug ${f.ok ? '' : 'opacity-40'}`}>
            {f.ok
              ? <Check className={`w-4 h-4 shrink-0 mt-0.5 ${highlighted ? 'text-accent-light' : 'text-accent'}`} />
              : <X className={`w-4 h-4 shrink-0 mt-0.5 ${highlighted ? 'text-bg-alt/40' : 'text-ink-faint'}`} />}
            <span className={highlighted ? 'text-bg-alt/90' : 'text-ink-muted'}>{f.text}</span>
          </li>
        ))}
      </ul>
      <a
        href={`mailto:${FOUNDER_EMAIL}?subject=${encodeURIComponent(`Interested in Rekaman ${name}`)}`}
        className={highlighted ? 'btn-accent w-full' : 'btn-secondary w-full'}
      >
        {cta}
      </a>
    </div>
  );
}

/* ============================================================
   TRUST
============================================================ */
function Trust() {
  return (
    <section className="py-20 md:py-28 bg-bg-alt border-y border-border">
      <div className="container-wide">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="eyebrow mb-6">Built for India</p>
            <h2 className="h-section mb-6">
              We&rsquo;re built where you sell.
            </h2>
            <p className="text-[17px] text-ink-muted leading-relaxed mb-8">
              Rekaman is built in Tamil Nadu by an Indian engineer for Indian e-commerce.
              That means: WhatsApp-native sharing, multilingual UI in regional languages,
              UPI-friendly billing, low-end Android fallback, and a founder you can
              actually reach on WhatsApp.
            </p>
            <div className="space-y-4">
              <TrustItem icon="📍" title="Built in Tamil Nadu, India" detail="Founder-led. Indian SaaS pricing. Indian customer support hours." />
              <TrustItem icon="🔓" title="Open APIs · no lock-in" detail="Export your 3D models any time. Cancel and you keep your assets." />
              <TrustItem icon="🛡" title="DPDP Act 2023 compliant" detail="Right-to-export and right-to-delete endpoints from day one." />
              <TrustItem icon="⚡" title="Production-grade infrastructure" detail="AWS Mumbai · Sentry monitored · 99.5% uptime SLA on all paid plans." />
            </div>
          </div>

          <div className="rounded-2xl p-8 bg-bg border border-border">
            <p className="eyebrow mb-4">Talk to the founder</p>
            <h3 className="h-card mb-2">Sivasankari E</h3>
            <p className="text-[14px] text-ink-muted mb-6">Founder · Software engineer · Tamil Nadu</p>
            <div className="space-y-3 mb-8">
              <a href={`mailto:${FOUNDER_EMAIL}`} className="block text-[15px] hover:text-accent transition-colors">
                <span className="text-ink-muted">Email · </span>
                <span className="text-ink">{FOUNDER_EMAIL}</span>
              </a>
              <a href={`https://wa.me/${WHATSAPP_E164.replace('+', '')}`} target="_blank" rel="noopener noreferrer" className="block text-[15px] hover:text-accent transition-colors">
                <span className="text-ink-muted">WhatsApp · </span>
                <span className="text-ink">{WHATSAPP_DISPLAY}</span>
              </a>
              <a href="https://www.linkedin.com/company/rekaman" target="_blank" rel="noopener noreferrer" className="block text-[15px] hover:text-accent transition-colors">
                <span className="text-ink-muted">LinkedIn · </span>
                <span className="text-ink">/company/rekaman</span>
              </a>
            </div>
            <a href={`mailto:${FOUNDER_EMAIL}?subject=${encodeURIComponent('Demo call request')}`} className="btn-primary w-full">
              Book a 20-min demo call
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustItem({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="text-[20px] mt-0.5" aria-hidden>{icon}</div>
      <div>
        <div className="font-medium text-[15px]">{title}</div>
        <div className="text-[13.5px] text-ink-muted mt-0.5 leading-relaxed">{detail}</div>
      </div>
    </div>
  );
}

/* ============================================================
   FINAL CTA
============================================================ */
function FinalCTA() {
  return (
    <section className="py-24 md:py-32">
      <div className="container-wide max-w-[920px] text-center">
        <h2 className="h-section mb-6">
          Ready to add AR to your store?
        </h2>
        <p className="text-[18px] text-ink-muted max-w-[600px] mx-auto mb-10 leading-relaxed">
          Concierge onboarding for your first 5 products — we set everything up. You see
          AR live on your store within 7 days, or your money back.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {/* Primary close → the 60-second onboarding form. */}
          <a href="/onboard" className="btn-accent">
            Get started — 60-second form
          </a>
          <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            See live demo
          </a>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   FOOTER
============================================================ */
function Footer() {
  return (
    <footer className="bg-ink text-bg-alt pt-20 pb-10">
      <div className="container-wide">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <Cube className="w-6 h-6" stroke="#8B7FFF" />
              <span className="font-medium text-[18px] tracking-[-0.01em]">rekaman</span>
            </div>
            <p className="text-[14px] text-bg-alt/60 leading-relaxed">
              Spatial commerce for any e-commerce store. Built in Tamil Nadu.
            </p>
          </div>
          <FooterCol title="Product" links={[
            { label: 'Live demo', href: DEMO_URL, external: true },
            { label: 'How it works', href: '/#how' },
            { label: 'Pricing', href: '/#pricing' },
          ]} />
          <FooterCol title="Legal" links={[
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
            { label: 'Refund Policy', href: '/refund' },
            { label: 'Contact', href: '/contact' },
          ]} />
          <FooterCol title="Connect" links={[
            { label: FOUNDER_EMAIL, href: `mailto:${FOUNDER_EMAIL}` },
            { label: 'WhatsApp', href: `https://wa.me/${WHATSAPP_E164.replace('+', '')}`, external: true },
            { label: 'LinkedIn', href: 'https://www.linkedin.com/company/rekaman', external: true },
          ]} />
        </div>
        <div className="pt-8 border-t border-bg-alt/10 flex flex-wrap justify-between items-center gap-4 text-[12.5px] text-bg-alt/40">
          <div>© 2026 Rekaman Spatial Private Limited (incorporation in progress) · Tamil Nadu, India</div>
          <div>v1.0 · Built with care</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <h3 className="font-medium text-[13px] uppercase tracking-[0.08em] mb-5 text-bg-alt/80">{title}</h3>
      <ul className="space-y-3">
        {links.map((l, i) => (
          <li key={i}>
            <a
              href={l.href}
              target={l.external ? '_blank' : undefined}
              rel={l.external ? 'noopener noreferrer' : undefined}
              className="text-[14px] text-bg-alt/60 hover:text-bg-alt transition-colors"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================================================
   ICONS — inline SVG, no external deps
============================================================ */
function Cube({ className, stroke = '#5A4FCF' }: { className?: string; stroke?: string }) {
  return (
    <svg viewBox="0 0 28 30" fill="none" className={className} aria-hidden>
      <g stroke={stroke} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
        <path d="M 14 2 L 26 9 L 26 21 L 14 28 L 2 21 L 2 9 Z" />
        <path d="M 14 2 L 14 14 L 26 21" />
        <path d="M 14 14 L 2 21" />
      </g>
    </svg>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M3 8.5L6.5 12L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
