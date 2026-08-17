import { Hero3D } from './Hero3D';
import { Nav } from './Nav';
import { Check } from './icons';
import { DEMO_URL, ONBOARD } from '../_lib/site';

const PLATFORMS = ['Shopify', 'WooCommerce', 'Magento', 'BigCommerce', 'Webflow', 'Wix', 'Custom'];
const HERO_TICKS = ['No app download', 'No 3D artists', 'Works on any store'];

export function Hero() {
  return (
    <div className="relative overflow-hidden bg-navy text-white">
      <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-60" aria-hidden />
      <div
        aria-hidden
        className="animate-float-slow pointer-events-none absolute inset-x-0 -top-40 h-[560px]"
        style={{ background: 'radial-gradient(46% 46% at 62% 30%, rgba(59,130,246,0.22), transparent 72%)' }}
      />

      <Nav />

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
            {HERO_TICKS.map((t) => (
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

      <div className="relative border-t border-white/10">
        <div className="container-wide flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-7">
          <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-navy-muted">Works on</span>
          {PLATFORMS.map((p) => (
            <span key={p} className="text-[15px] font-semibold text-navy-fg/70">{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
