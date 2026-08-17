import { Reveal } from './Reveal';
import { DEMO_URL, ONBOARD, FOUNDER_EMAIL, WA, WA_DISPLAY } from '../_lib/site';

export function BookDemo() {
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
