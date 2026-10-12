import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Refund policy — Open When Jar",
  description: "The current pre-launch payment and refund position for Open When Jar.",
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      eyebrow="Clear before checkout"
      title="Refund policy"
      summary="Open When Jar does not currently accept live payments. Development checkout uses Dodo Test Mode, which simulates payments without charging real money."
    >
      <section>
        <h2>1. Current payment status</h2>
        <p>Development checkout opens Dodo Test Mode. A test plan or extra Jar is granted only after a signed sandbox payment confirmation; no real payment or payout occurs. Test records are not live orders, and live checkout, payment reconciliation, and refund handling are not enabled.</p>
      </section>

      <section>
        <h2>2. Displayed prices</h2>
        <p>Plan and extra-Jar prices currently shown in the product describe the intended one-time purchase model and are marked before applicable tax. They are not an offer for a live sale while production checkout is disabled.</p>
      </section>

      <section>
        <h2>3. Before live sales begin</h2>
        <p>Open When Jar will publish the final refund eligibility rules, request window, request method, processing time, treatment of used and unused Jars, effect of a refund on hosted content, and handling of payment disputes before enabling any live charge.</p>
        <p>The final rules will be checked against the actual payment provider process and the consumer requirements that apply to the operator and buyer. We will not assume that a digital purchase is automatically non-refundable.</p>
      </section>

      <section>
        <h2>4. No automatic renewal</h2>
        <p>The confirmed product model is a one-time purchase. It does not include a subscription, automatic renewal, or automatic future charge.</p>
      </section>

      <section>
        <h2>5. Contact</h2>
        <p>A working support address and the legal seller identity will be added here before live checkout is enabled. Until then, this page records the product’s pre-launch status and is not a substitute for the final purchase terms shown at checkout.</p>
        <p>See the <Link href="/terms">Terms of Use</Link> and <Link href="/privacy">Privacy Notice</Link> for the current service rules.</p>
      </section>
    </LegalPage>
  );
}
