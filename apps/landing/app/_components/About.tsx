import { Reveal } from './Reveal';

export function About() {
  return (
    <section className="bg-canvas">
      <div className="container-wide py-16 lg:py-24">
        <Reveal className="mx-auto max-w-3xl rounded-[2rem] border border-line bg-surface p-8 shadow-card sm:p-12">
          <p className="eyebrow">Built in Tamil Nadu</p>
          <blockquote className="mt-4 text-[20px] font-medium leading-relaxed tracking-[-0.01em] text-ink sm:text-[26px]">
            “I got tired of watching Indian brands lose a quarter of their orders to
            returns — shoppers just couldn’t tell if a product would fit. So I built
            Rekaman: <span className="text-gradient">photo-to-AR in 90 seconds</span>, at a
            price a small store can actually afford.”
          </blockquote>
          <div className="mt-7 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-[17px] font-semibold text-white">
              S
            </span>
            <div>
              <p className="text-[15px] font-semibold text-ink">Sivasankari</p>
              <p className="text-[13px] text-muted">Founder, Rekaman · reachable on WhatsApp</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
