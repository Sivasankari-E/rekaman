import { Reveal } from './Reveal';

const STATS: Array<[string, string, string]> = [
  ['25–30%', 'Return rate in Indian e-commerce', 'Furniture, decor, eyewear — mostly “it didn’t look or fit right.”'],
  ['₹2K–5K', 'Cost per return', 'Reverse logistics, restocking, refunds — your margin, gone.'],
  ['3–4×', 'Conversion lift with AR', 'Shoppers who preview in their own space add to cart far more often.'],
];

export function Problem() {
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
          {STATS.map(([n, label, d], i) => (
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
