import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Refund policy — Open When Jar",
  description: "When Open When Jar purchases can be refunded and how to ask.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      eyebrow="Clear before checkout"
      title="Refund policy"
      summary="Plans and extra Jar credits are one-time purchases. This page explains when a purchase can be refunded and how to ask."
    >
      <section>
        <h2>1. What you are buying</h2>
        <p>A plan gives each of its seats 10 Jars; an extra Jar credit gives one more Jar to the seat that buys it. Both are one-time purchases with no subscription, automatic renewal, or future charge. Prices shown in the app are before tax; applicable tax is calculated and added at checkout. Purchases are sold and processed by Dodo Payments as Merchant of Record, and Dodo’s name appears on your receipt and card statement.</p>
      </section>

      <section>
        <h2>2. When we refund</h2>
        <ul>
          <li><strong>Duplicate charges:</strong> an accidental second charge for the same purchase is refunded in full.</li>
          <li><strong>Technical failure:</strong> if a verified fault on our side means you cannot use what you paid for, and we cannot fix it, we refund the purchase.</li>
          <li><strong>Change of mind:</strong> we do not refund unused or used credits because you changed your mind, except where the consumer law that applies to you gives you that right. Unused credits do not expire while your account is active.</li>
        </ul>
        <p>An approved refund revokes the matching unused credit. If the credit was already used to send a Jar, we review the case individually rather than removing a gift a recipient has already received.</p>
      </section>

      <section>
        <h2>3. How to ask</h2>
        <p>Submit a refund request from the Account section while signed in, or email <a href="mailto:hello@openwhenjar.bond">hello@openwhenjar.bond</a> from the address on your account, within 14 days of the charge. Include the date and the plan or credit you bought. We review requests within 4 calendar days and, if approved, submit the refund to Dodo Payments, which returns the money to your original payment method. Dodo’s processing time and your bank’s posting time then apply.</p>
      </section>

      <section>
        <h2>4. Disputes</h2>
        <p>Please contact us before opening a dispute with your bank or card issuer, as we can usually resolve the problem faster. Dodo Payments handles chargebacks as Merchant of Record; a chargeback for a purchase that was delivered may lead to the matching credit being revoked.</p>
        <p>See the <Link href="/terms">Terms of Use</Link> and <Link href="/privacy">Privacy Notice</Link> for the service rules.</p>
      </section>
    </LegalPage>
  );
}
