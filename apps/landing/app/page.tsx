import type { Metadata } from 'next';
import { Hero } from './_components/Hero';
import { Problem } from './_components/Problem';
import { Features } from './_components/Features';
import { HowItWorks } from './_components/HowItWorks';
import { Pricing } from './_components/Pricing';
import { FaqSection } from './_components/FaqSection';
import { About } from './_components/About';
import { BookDemo } from './_components/BookDemo';
import { Footer } from './_components/Footer';

export const metadata: Metadata = {
  alternates: { canonical: 'https://rekaman.io' },
};

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Problem />
      <Features />
      <HowItWorks />
      <Pricing />
      <FaqSection />
      <About />
      <BookDemo />
      <Footer />
    </main>
  );
}
