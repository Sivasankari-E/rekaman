import type { Metadata } from 'next';
import { SimpleNav, SimpleFooter } from '../_components/SimpleNav';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with Rekaman. Founder-led support, based in Tamil Nadu, India.',
};

export default function ContactPage() {
  return (
    <>
      <SimpleNav />
      <main className="container-wide py-16 md:py-24">
        <div className="max-w-[860px] mx-auto">
          <p className="eyebrow mb-4">Contact</p>
          <h1 className="font-serif font-medium text-[40px] md:text-[56px] tracking-[-0.02em] leading-[1.1] mb-4">
            Talk to a human.
          </h1>
          <p className="text-[18px] text-ink-muted leading-relaxed mb-16 max-w-[600px]">
            Rekaman is built and supported by Sivasankari, the founder. No support
            queues, no canned responses, no chatbots. WhatsApp messages are read.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <ContactCard
              title="Sales &amp; demos"
              email="founder@rekaman.io"
              detail="20-min walkthrough of the platform on Zoom. We&rsquo;ll set up your first 5 products free during the call."
              cta="Book a demo"
            />
            <ContactCard
              title="Support"
              email="support@rekaman.io"
              detail="Bug reports, integration help, technical questions. Response within 24 hours on weekdays."
              cta="Get help"
            />
            <ContactCard
              title="Billing"
              email="billing@rekaman.io"
              detail="Invoices, refunds, plan changes, GST queries. Response within 2 business days."
              cta="Email billing"
            />
            <ContactCard
              title="Privacy &amp; legal"
              email="privacy@rekaman.io"
              detail="DPDP requests, data exports, account deletion, legal inquiries. Response within 15 working days as required by DPDP Act 2023."
              cta="Privacy team"
            />
          </div>

          <div className="rounded-2xl bg-ink text-bg-alt p-10">
            <h2 className="font-serif font-medium text-[28px] mb-2">Other ways to reach us</h2>
            <p className="text-bg-alt/60 mb-8 text-[15px]">All channels go to the founder directly.</p>

            <div className="grid sm:grid-cols-2 gap-x-12 gap-y-6">
              <ContactRow label="WhatsApp" value="+91 8248 524449" href="https://wa.me/918248524449" />
              <ContactRow label="LinkedIn" value="linkedin.com/company/rekaman" href="https://www.linkedin.com/company/rekaman" />
              <ContactRow label="X / Twitter" value="@rekaman_io" href="https://x.com/rekaman_io" />
              <ContactRow label="GitHub" value="github.com/rekaman" href="https://github.com/rekaman" />
            </div>
          </div>

          <div className="mt-16 pt-12 border-t border-border">
            <h2 className="font-serif font-medium text-[24px] mb-6">Registered office</h2>
            <p className="text-[15px] text-ink-muted leading-relaxed">
              Rekaman Spatial Private Limited<br />
              [Registered office address — to be added post-COI, expected May 2026]<br />
              Thanjavur, Tamil Nadu, India<br />
              CIN: <span className="font-mono text-[13px]">[to be added post-incorporation]</span><br />
              GST: <span className="text-ink-faint">Not yet registered (under threshold)</span>
            </p>
          </div>

          <div className="mt-12 pt-12 border-t border-border">
            <h2 className="font-serif font-medium text-[24px] mb-6">Grievance Officer</h2>
            <p className="text-[15px] text-ink-muted leading-relaxed mb-3">
              Per Section 10 of the Digital Personal Data Protection Act, 2023:
            </p>
            <div className="text-[15px]">
              <strong className="text-ink">Sivasankari E</strong><br />
              <span className="text-ink-muted">Founder &amp; Data Protection Officer</span><br />
              <a href="mailto:privacy@rekaman.io" className="text-accent hover:underline">privacy@rekaman.io</a>
            </div>
          </div>
        </div>
      </main>
      <SimpleFooter />
    </>
  );
}

function ContactCard({ title, email, detail, cta }: { title: string; email: string; detail: string; cta: string }) {
  return (
    <div className="rounded-2xl border border-border p-7 bg-bg-alt">
      <h3 className="font-serif font-medium text-[20px] mb-2" dangerouslySetInnerHTML={{ __html: title }} />
      <p className="text-[14px] text-ink-muted leading-relaxed mb-5">{detail}</p>
      <a href={`mailto:${email}`} className="btn-primary text-[14px] px-5 py-2.5">
        {cta} →
      </a>
      <p className="text-[12.5px] text-ink-faint mt-3 font-mono">{email}</p>
    </div>
  );
}

function ContactRow({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <div>
      <div className="text-[12px] uppercase tracking-[0.08em] text-bg-alt/40 mb-1">{label}</div>
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-[15px] text-bg-alt hover:text-accent-light transition-colors">
        {value}
      </a>
    </div>
  );
}
