import { Reveal } from './Reveal';
import { IcScale, IcDevices, IcBolt, IcQr, IcCode, IcGlobe } from './icons';

function Bento({
  title,
  children,
  icon,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`group rounded-2xl border border-line bg-surface p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-pop ${className}`}>
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand transition-transform duration-200 group-hover:scale-110">
        {icon}
      </span>
      <h3 className="mt-4 text-[18px] font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mt-1.5 max-w-xl text-[14.5px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}

export function Features() {
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
