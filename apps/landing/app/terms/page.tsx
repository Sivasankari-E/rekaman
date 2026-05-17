import type { Metadata } from 'next';
import { SimpleNav, SimpleFooter } from '../_components/SimpleNav';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing use of the Rekaman platform.',
};

export default function TermsPage() {
  return (
    <>
      <SimpleNav />
      <main className="container-wide py-16 md:py-24">
        <div className="max-w-prose mx-auto">
          <p className="eyebrow mb-4">Legal</p>
          <h1 className="font-serif font-medium text-[40px] md:text-[48px] tracking-[-0.02em] leading-[1.1] mb-3">Terms of Service</h1>
          <p className="text-[14px] text-ink-faint mb-12">Last updated: 7 May 2026 · Effective: 7 May 2026</p>

          <div className="prose-rk">
            <p>
              These Terms of Service (&ldquo;<strong>Terms</strong>&rdquo;) govern your use of the Rekaman platform
              operated by Rekaman Spatial Private Limited (&ldquo;<strong>Rekaman</strong>,&rdquo; &ldquo;<strong>we</strong>,&rdquo; &ldquo;<strong>us</strong>&rdquo;).
              By creating an account or using the service, you accept these Terms.
            </p>

            <h2>1. The Service</h2>
            <p>
              Rekaman provides a software-as-a-service platform that lets e-commerce
              brands embed augmented reality experiences on their product pages. The
              service includes: AI-based 3D model generation from product photos, an
              embeddable JavaScript SDK that renders AR on shopper devices, an analytics
              dashboard, and supporting APIs.
            </p>

            <h2>2. Eligibility &amp; account</h2>
            <ul>
              <li>You must be at least 18 years of age and authorised to bind your business to these Terms.</li>
              <li>You are responsible for the accuracy of information provided during signup.</li>
              <li>You are responsible for maintaining the confidentiality of your password and API keys.</li>
              <li>You must notify us immediately of any unauthorised use of your account at <a href="mailto:security@rekaman.io">security@rekaman.io</a>.</li>
            </ul>

            <h2>3. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Upload product photos that infringe third-party intellectual property rights.</li>
              <li>Upload content that is illegal, harmful, defamatory, sexually explicit, or violates the rights of others.</li>
              <li>Attempt to reverse-engineer, decompile, or extract source code from the SDK or platform beyond what is permitted by applicable law.</li>
              <li>Use the service to send spam, conduct phishing, or distribute malware.</li>
              <li>Resell, sublicense, or white-label the service except under an Enterprise plan with explicit written agreement.</li>
              <li>Exceed your plan&rsquo;s rate limits or session quotas through automated means.</li>
              <li>Use the service in violation of any applicable Indian or international law.</li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate these
              terms after providing reasonable notice (except for severe violations
              involving illegality or security threats, where suspension may be immediate).
            </p>

            <h2>4. Subscription &amp; payment</h2>
            <ul>
              <li>Subscriptions are billed monthly or annually in advance via Razorpay in Indian Rupees (₹).</li>
              <li>All prices on the website are exclusive of GST. GST will be added at applicable rates from the date Rekaman becomes GST-registered.</li>
              <li>Annual plans receive a 2-month discount and are non-refundable except as detailed in our <a href="/refund">Refund Policy</a>.</li>
              <li>Plan upgrades are pro-rated; downgrades take effect at the next billing cycle.</li>
              <li>Failed payments will result in service suspension after 7 days of dunning emails. Account data is retained for 30 days post-suspension before deletion.</li>
              <li>You authorise Rekaman to charge your registered payment method for recurring subscription fees until you cancel.</li>
            </ul>

            <h2>5. Intellectual property</h2>
            <h3>Your content</h3>
            <p>
              You retain all ownership rights to product photos, descriptions, branding,
              and 3D models you upload. You grant Rekaman a limited, non-exclusive
              licence to process this content solely to provide the service (e.g., send
              photos to Meshy.ai for 3D generation, host generated GLB files on AWS S3,
              serve them via CloudFront).
            </p>
            <h3>Our content</h3>
            <p>
              Rekaman retains all rights to the platform, SDK, dashboard, documentation,
              and brand. Generated 3D models are licensed to you under a perpetual
              royalty-free licence for use on your own e-commerce properties; you may
              export and self-host them at any time.
            </p>
            <h3>Aggregate data</h3>
            <p>
              We may use aggregated, anonymised AR engagement data to improve the
              service and publish industry benchmarks (e.g., &ldquo;average AR placement
              rate across furniture brands&rdquo;). We will never identify your brand or
              shoppers in such reports.
            </p>

            <h2>6. Service availability &amp; SLA</h2>
            <ul>
              <li><strong>Starter plan:</strong> best-effort availability, no formal SLA.</li>
              <li><strong>Pro plan:</strong> 99.5% monthly uptime SLA. Service credits issued automatically for breaches.</li>
              <li><strong>Enterprise plan:</strong> custom SLA up to 99.9%, negotiated separately.</li>
            </ul>
            <p>
              Scheduled maintenance is announced 48 hours in advance via email and the
              status page (status.rekaman.io, Phase 2). Maintenance windows do not count
              against uptime calculations.
            </p>

            <h2>7. Confidentiality</h2>
            <p>
              Each party agrees to keep confidential information received from the other
              confidential and use it only for the purposes of this agreement. This does
              not apply to information that is publicly known, independently developed,
              or required to be disclosed by law.
            </p>

            <h2>8. Warranties &amp; disclaimers</h2>
            <p>
              The service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; To the maximum extent
              permitted by law, we disclaim all warranties — express or implied —
              including warranties of merchantability, fitness for a particular purpose,
              and non-infringement. We do not warrant that the service will be
              uninterrupted, error-free, or that AI-generated 3D models will perfectly
              represent your physical products.
            </p>

            <h2>9. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by Indian law, in no event will Rekaman&rsquo;s
              aggregate liability arising out of or related to these Terms exceed the
              amount paid by you to Rekaman in the 12 months preceding the claim. We
              are not liable for indirect, incidental, special, consequential, or
              punitive damages, including lost profits, lost data, or business
              interruption, even if advised of the possibility of such damages.
            </p>

            <h2>10. Indemnity</h2>
            <p>
              You agree to indemnify and hold Rekaman harmless from claims arising from
              your content (including IP infringement claims related to product photos
              you upload), your violation of these Terms, or your violation of
              third-party rights.
            </p>

            <h2>11. Term &amp; termination</h2>
            <ul>
              <li>You may cancel your subscription any time via the dashboard. Cancellation takes effect at the end of the current billing period.</li>
              <li>We may terminate accounts that violate these Terms after reasonable notice.</li>
              <li>Upon termination, your access ends immediately, but you have 30 days to export your data.</li>
              <li>After 30 days, all customer data is permanently deleted (except as required by law for tax/accounting retention).</li>
            </ul>

            <h2>12. Changes to these Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be
              notified via email at least 30 days before they take effect. Continued
              use after the effective date constitutes acceptance.
            </p>

            <h2>13. Governing law &amp; dispute resolution</h2>
            <p>
              These Terms are governed by the laws of India. Any disputes shall be
              resolved exclusively by the courts of Thanjavur, Tamil Nadu, India. Both
              parties agree to first attempt good-faith negotiation for at least 30 days
              before initiating formal dispute resolution.
            </p>

            <h2>14. Contact</h2>
            <p>
              For questions about these Terms, please email <a href="mailto:legal@rekaman.io">legal@rekaman.io</a>.
            </p>
          </div>
        </div>
      </main>
      <SimpleFooter />
    </>
  );
}
