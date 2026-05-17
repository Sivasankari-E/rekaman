import type { Metadata } from 'next';
import { SimpleNav, SimpleFooter } from '../_components/SimpleNav';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Rekaman collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <>
      <SimpleNav />
      <main className="container-wide py-16 md:py-24">
        <div className="max-w-prose mx-auto">
          <p className="eyebrow mb-4">Legal</p>
          <h1 className="font-serif font-medium text-[40px] md:text-[48px] tracking-[-0.02em] leading-[1.1] mb-3">Privacy Policy</h1>
          <p className="text-[14px] text-ink-faint mb-12">Last updated: 7 May 2026 · Effective: 7 May 2026</p>

          <div className="prose-rk">
            <p>
              Rekaman Spatial Private Limited (&ldquo;<strong>Rekaman</strong>,&rdquo; &ldquo;<strong>we</strong>,&rdquo; &ldquo;<strong>our</strong>&rdquo;) operates the Rekaman platform — a B2B
              SaaS service that enables e-commerce brands to add augmented reality
              experiences to their product pages. This Privacy Policy explains how we
              handle personal information of brand customers (our paying users) and
              shoppers who interact with the Rekaman SDK on brand websites.
            </p>
            <p>
              We comply with India&rsquo;s Digital Personal Data Protection Act, 2023 (&ldquo;DPDP&rdquo;)
              and the General Data Protection Regulation (&ldquo;GDPR&rdquo;) where applicable.
            </p>

            <h2>1. Who is the Data Fiduciary</h2>
            <p>
              Rekaman Spatial Private Limited acts as the Data Fiduciary for personal
              information you provide directly to us when you create a brand account. For
              data collected from shoppers via the Rekaman SDK on brand websites, we act
              as a Data Processor on behalf of the brand, who is the Data Fiduciary for
              their shoppers.
            </p>

            <h2>2. What data we collect</h2>
            <h3>From brand customers (paying users)</h3>
            <ul>
              <li><strong>Account information:</strong> name, email address, password (hashed with bcrypt), phone number (optional), and the company name you provide.</li>
              <li><strong>Payment information:</strong> processed by Razorpay. We never store full card numbers, CVV, or UPI VPAs — Razorpay handles all payment data per RBI guidelines.</li>
              <li><strong>Product information:</strong> photos you upload to generate 3D models, product names, prices, dimensions, and descriptions.</li>
              <li><strong>Usage data:</strong> API requests, dashboard interactions, login times, IP addresses for security monitoring.</li>
            </ul>
            <h3>From shoppers (via the SDK on brand websites)</h3>
            <ul>
              <li><strong>Anonymous session data:</strong> approximate location (country/city via IP geolocation, never precise GPS), device type (Android/iOS/desktop), browser language, viewport size.</li>
              <li><strong>AR engagement events:</strong> whether the AR button was tapped, whether a 3D model was placed, session duration, which product variants were viewed.</li>
              <li><strong>No camera or photo data is sent to Rekaman servers.</strong> All AR processing happens locally on the shopper&rsquo;s device. Shoppers&rsquo; rooms, faces, and bodies are never uploaded.</li>
            </ul>

            <h2>3. How we use this data</h2>
            <ul>
              <li>To provide the Rekaman service: generate 3D models, host the SDK, render AR experiences.</li>
              <li>To bill and process payments via Razorpay.</li>
              <li>To send transactional emails (invoices, account notifications, security alerts) via Resend. We do not send marketing emails without explicit opt-in.</li>
              <li>To provide analytics dashboards to brands so they can measure AR engagement.</li>
              <li>To detect and prevent abuse, fraud, and security incidents.</li>
              <li>To comply with legal obligations under Indian law (tax, accounting, court orders).</li>
            </ul>

            <h2>4. Who we share data with</h2>
            <p>We share data only with sub-processors strictly necessary to operate the service:</p>
            <ul>
              <li><strong>Meshy.ai</strong> (3D model generation) — your product photos are sent to Meshy for AI processing. Photos are deleted from Meshy&rsquo;s servers within 30 days per their data retention policy.</li>
              <li><strong>Razorpay</strong> (payments) — billing details only. Razorpay is PCI-DSS certified and RBI-regulated.</li>
              <li><strong>Amazon Web Services</strong> (Mumbai region) — primary infrastructure. All data stored within India unless explicitly elected otherwise (no current customer has elected this).</li>
              <li><strong>Neon (Postgres)</strong> — database hosted in Singapore (Mumbai unavailable on Neon as of May 2026; we will migrate to Mumbai hosting when available).</li>
              <li><strong>Upstash Redis</strong> — Mumbai region, used for transient queue data, no PII stored.</li>
              <li><strong>Sentry</strong> (error tracking) — receives stack traces with PII redacted via Pino logger before transmission.</li>
              <li><strong>PostHog</strong> (product analytics) — only on the brand-facing dashboard, not on shopper-facing AR experiences. Anonymous usage events.</li>
              <li><strong>Resend</strong> (transactional email) — your email address only.</li>
              <li><strong>Google</strong> (OAuth login, optional) — only if you sign in with Google.</li>
            </ul>
            <p>
              We do not sell your personal information. We do not share data with
              advertising networks or data brokers.
            </p>

            <h2>5. Data retention</h2>
            <ul>
              <li><strong>Active account data:</strong> retained while your subscription is active.</li>
              <li><strong>After account deletion:</strong> personal information deleted within 30 days. Financial records (invoices, transactions) retained for 7 years to comply with Indian tax law (Income Tax Act, GST regulations).</li>
              <li><strong>AR session events:</strong> aggregated anonymously after 90 days; raw event-level data deleted.</li>
              <li><strong>Backups:</strong> rotating 30-day backup window; deleted data is removed from backups within 30 days of deletion request.</li>
            </ul>

            <h2>6. Your rights (DPDP Act 2023 + GDPR)</h2>
            <ul>
              <li><strong>Right to access:</strong> request a copy of all your data via the dashboard or by emailing <a href="mailto:privacy@rekaman.io">privacy@rekaman.io</a>.</li>
              <li><strong>Right to correction:</strong> update inaccurate data via the dashboard or by emailing us.</li>
              <li><strong>Right to erasure:</strong> request account deletion. We will delete or anonymize your data within 30 days, subject to legal retention obligations.</li>
              <li><strong>Right to data portability:</strong> request a JSON export of your account data.</li>
              <li><strong>Right to grievance redressal:</strong> contact our Data Protection Officer (below). We respond within 15 working days as required by DPDP.</li>
              <li><strong>Right to consent withdrawal:</strong> withdraw consent for processing at any time. May affect service availability.</li>
            </ul>

            <h2>7. Security measures</h2>
            <ul>
              <li>All data in transit is encrypted via TLS 1.3.</li>
              <li>Passwords hashed with bcrypt (cost factor 12).</li>
              <li>API keys stored as SHA-256 hashes; never stored in plaintext.</li>
              <li>Strict tenant isolation enforced at three layers (auth middleware, repository signatures, DB constraints) with automated tests on every code commit.</li>
              <li>Multi-factor authentication available for all dashboard accounts.</li>
              <li>Vendor SOC 2 / ISO 27001 certifications verified for AWS, Razorpay, Sentry.</li>
              <li>Sentry error tracking with PII redaction.</li>
              <li>Regular security audits before each major release.</li>
            </ul>

            <h2>8. Cookies</h2>
            <p>
              The Rekaman dashboard uses functional cookies for authentication (JWT
              session tokens) and CSRF protection. We do not use advertising or tracking
              cookies. The Rekaman SDK does not use cookies on shopper-facing brand
              websites.
            </p>

            <h2>9. Children&rsquo;s privacy</h2>
            <p>
              Rekaman is a B2B service intended for e-commerce businesses. We do not
              knowingly collect personal information from individuals under 18. If you
              believe we have collected data from a minor, contact us immediately and
              we will delete it.
            </p>

            <h2>10. International transfers</h2>
            <p>
              Some sub-processors (Neon Postgres in Singapore, Sentry, Resend) may store
              or process data outside India. Where this occurs, we rely on Standard
              Contractual Clauses or equivalent legal mechanisms to ensure adequate
              protection. We will migrate to India-only hosting where vendor support
              becomes available (target: Phase 4, 2027).
            </p>

            <h2>11. Changes to this policy</h2>
            <p>
              We will notify brand customers via email at least 14 days before any
              material change to this policy. Continued use after changes take effect
              constitutes acceptance.
            </p>

            <h2>12. Grievance Officer</h2>
            <p>
              Per Section 10 of the DPDP Act 2023, our designated Grievance Officer is:
            </p>
            <p>
              <strong>Sivasankari E</strong> (Founder &amp; Data Protection Officer)<br />
              Email: <a href="mailto:privacy@rekaman.io">privacy@rekaman.io</a><br />
              Response time: within 15 working days
            </p>
            <p>
              If you are unsatisfied with our response, you may escalate to the Data
              Protection Board of India (DPB) under the DPDP Act 2023.
            </p>

            <h2>13. Contact</h2>
            <p>
              For any privacy-related questions, please email <a href="mailto:privacy@rekaman.io">privacy@rekaman.io</a> or write to:
            </p>
            <p>
              Rekaman Spatial Private Limited<br />
              [Registered office address — to be added post-COI]<br />
              Thanjavur, Tamil Nadu, India
            </p>
          </div>
        </div>
      </main>
      <SimpleFooter />
    </>
  );
}
