import { Reveal } from './Reveal';
import { PricingCards } from './PricingCards';
import { fetchPlans, planToCard } from '../_lib/site';

/* Server component — fetches live plans from the DB (ISR), renders the
   interactive client cards. */
export async function Pricing() {
  const cards = (await fetchPlans()).map(planToCard);
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
        <Reveal delay={80}>
          <PricingCards cards={cards} />
        </Reveal>
        <p className="mt-8 text-center text-[13px] text-faint">Annual plans get 2 months free · Prices exclude GST</p>
      </div>
    </section>
  );
}
