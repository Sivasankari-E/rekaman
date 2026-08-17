'use client';

import { useState } from 'react';

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Do I need 3D files or a 3D artist?',
    a: 'No. You just upload a few product photos (even 1–4 from your catalog) and our AI builds a clean, optimized 3D model in about 90 seconds. No studios, no artists, no CAD files.',
  },
  {
    q: 'Which platforms does it work on?',
    a: 'Any store that can add a script tag — Shopify, WooCommerce, Magento, BigCommerce, Webflow, Wix, or a fully custom site. It’s one line of code, the same everywhere.',
  },
  {
    q: 'What do my shoppers need to use it?',
    a: 'Nothing to install. On iPhone it opens Apple’s AR Quick Look, on Android it uses WebXR, and on desktop there’s an interactive 3D viewer — all from the browser. No app download, ever.',
  },
  {
    q: 'I don’t have a website — can I still use it?',
    a: 'Yes. We give you a hosted link and a QR code you can drop into WhatsApp, Instagram, a Linktree, or even printed packaging. Shoppers scan and see your product in their room — no site needed.',
  },
  {
    q: 'How long does setup take?',
    a: 'Minutes. Add one script tag and a div to your product page and you’re live. For your first products, we set everything up for you — you just send photos.',
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. Rekaman is DPDP-compliant and built in India. We only handle your product photos and 3D models — no shopper personal data is required for AR.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes — no setup fees and no lock-in. Plans are month-to-month and you can cancel whenever you like.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto mt-10 max-w-3xl divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2 sm:px-6"
            >
              <span className="text-[16px] font-medium text-ink sm:text-[17px]">{f.q}</span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
                className={`shrink-0 text-brand transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {/* grid-rows trick → smooth height animation without measuring */}
            <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-[15px] leading-relaxed text-muted sm:px-6">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
