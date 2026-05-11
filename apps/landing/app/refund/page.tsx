import type { Metadata } from 'next';
import { SimpleNav, SimpleFooter } from '../_components/SimpleNav';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'How refunds work for Rekaman subscriptions.',
};

export default function RefundPage() {
  return (
    <>
      <SimpleNav />
      <main className="container-wide py-16 md:py-24">
        <div className="max-w-prose mx-auto">
          <p className="eyebrow mb-4">Legal</p>
          <h1 className="font-serif font-medium text-[40px] md:text-[48px] tracking-[-0.02em] leading-[1.1] mb-3">Refund &amp; Cancellation Policy</h1>
          <p className="text-[14px] text-ink-faint mb-12">Last updated: 7 May 2026</p>

          <div className="prose-rk">
            <p>
              We want you to be confident trying Rekaman. This Refund Policy explains
              when and how you can get your money back.
            </p>

            <h2>1. 7-day full refund</h2>
            <p>
              We offer a <strong>full refund within 7 days</strong> of your initial subscription
              purchase, no questions asked, provided you have used less than 50% of
              your plan&rsquo;s monthly AR session quota.
            </p>
            <p>
              To request a refund, email <a href="mailto:billing@rekaman.io">billing@rekaman.io</a>
              from the email address on your account, with subject line &ldquo;Refund
              request&rdquo; and your account email in the body. We will process the refund
              within 5 business days. The refund is credited back to the original
              payment method via Razorpay.
            </p>

            <h2>2. Pro-rata refund (Pro &amp; Enterprise plans)</h2>
            <p>
              For monthly subscriptions on the Pro or Enterprise plan, if you cancel
              after 7 days but before 30 days into a billing cycle, we will issue a
              pro-rata refund for the unused days, calculated as:
            </p>
            <p>
              <strong>Refund = (Days Remaining ÷ 30) × Monthly Fee × 0.7</strong>
            </p>
            <p>
              The 30% deduction covers AI generation costs (Meshy.ai credits already
              consumed for your products), payment processing fees, and engineering
              support time already provided.
            </p>

            <h2>3. Annual plans</h2>
            <p>
              Annual subscriptions are non-refundable beyond the initial 7-day window
              because they include a 2-month discount that is contingent on the annual
              commitment. Pro-rata refunds are not offered for annual plans except in
              the following exceptional cases:
            </p>
            <ul>
              <li>Documented service unavailability exceeding 7 consecutive days</li>
              <li>Material breach of these Terms by Rekaman</li>
              <li>Insolvency or business closure of Rekaman</li>
            </ul>

            <h2>4. What is not refundable</h2>
            <ul>
              <li>Subscription periods that have already elapsed</li>
              <li>Add-ons consumed (manual 3D refinement at ₹500/product, extra AI generation credits at ₹99/model)</li>
              <li>Subscriptions terminated for violation of our <a href="/terms">Terms of Service</a></li>
              <li>Plans where more than 50% of the monthly AR session quota has been consumed</li>
            </ul>

            <h2>5. Cancellation</h2>
            <p>
              You can cancel your subscription at any time:
            </p>
            <ul>
              <li>Via your dashboard: Settings → Billing → Cancel subscription (Phase 1, manual until dashboard self-serve ships in Week 11)</li>
              <li>By emailing <a href="mailto:billing@rekaman.io">billing@rekaman.io</a> from your account email</li>
            </ul>
            <p>
              Cancellation takes effect at the end of your current billing period. You
              retain access to all features until that period ends. After cancellation,
              you have 30 days to export your data before it is permanently deleted.
            </p>

            <h2>6. Failed payments</h2>
            <p>
              If a recurring payment fails (e.g., expired card, insufficient funds), we
              will:
            </p>
            <ul>
              <li>Retry the payment 3 times over 7 days via Razorpay</li>
              <li>Send dunning emails on day 1, 3, and 7</li>
              <li>Suspend service after 7 days if all retries fail</li>
              <li>Permanently delete the account after 30 additional days unless payment is resolved</li>
            </ul>

            <h2>7. Disputes</h2>
            <p>
              If you have a billing dispute, please contact us at <a href="mailto:billing@rekaman.io">billing@rekaman.io</a> first. We will investigate and respond within 5 business days.
              We commit to resolving good-faith disputes fairly. If we cannot reach
              agreement, the dispute resolution process in our <a href="/terms">Terms of Service</a> applies.
            </p>
            <p>
              You may also file a complaint with Razorpay&rsquo;s grievance redressal
              mechanism per RBI guidelines.
            </p>

            <h2>8. Contact</h2>
            <p>
              For all refund and billing questions:
            </p>
            <p>
              Email: <a href="mailto:billing@rekaman.io">billing@rekaman.io</a><br />
              Response time: within 2 business days
            </p>
          </div>
        </div>
      </main>
      <SimpleFooter />
    </>
  );
}
