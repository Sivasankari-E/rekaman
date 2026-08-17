import { Reveal } from './Reveal';

const STEPS: Array<[string, string, string]> = [
  ['01', 'Upload photos', 'Even 1–4 photos from your catalog — front, side, top.'],
  ['02', 'AI generates 3D', 'A clean, optimized model with real measurements, in ~90 seconds.'],
  ['03', 'Shoppers place it', 'They tap, point their camera, and see it at real scale.'],
];

export function HowItWorks() {
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
            {STEPS.map(([n, t, d]) => (
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
