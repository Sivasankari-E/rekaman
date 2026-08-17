import { Reveal } from './Reveal';
import { Faq } from './Faq';

export function FaqSection() {
  return (
    <section id="faq" className="border-y border-line bg-surface-2">
      <div className="container-wide py-16 lg:py-24">
        <Reveal>
          <p className="eyebrow">FAQ</p>
          <h2 className="mt-3 max-w-2xl text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[38px]">
            Questions, answered.
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <Faq />
        </Reveal>
      </div>
    </section>
  );
}
