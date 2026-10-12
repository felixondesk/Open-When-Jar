import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of use — Open When Jar",
  description: "Terms for using Open When Jar during pre-launch, with launch-dependent details identified.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="A thoughtful space, shared responsibly"
      title="Terms of use"
      summary="These terms describe the current rules for using Open When Jar while the service is in development."
    >
      <section>
        <h2>1. The service</h2>
        <p>Open When Jar lets registered users write private letters, add photographs and voice recordings, organise them into digital Jars, and send them to people in their accepted Circle. Recipients can open available letters and keep their own favourites and opening state.</p>
        <p>The service is in pre-launch development. Live payments, complete export, account deletion, expiry cleanup, and production support processes are not yet available. Open When Jar is a personal-gifting service; it does not provide therapy, medical advice, or emergency assistance.</p>
      </section>

      <section>
        <h2>2. Accounts, eligibility, and Circle connections</h2>
        <p>You are responsible for providing accurate account information, protecting your sign-in credentials, and activity performed through your account. Usernames must follow the displayed format and currently cannot be changed after they are finalised.</p>
        <p>A Jar can be sent only to someone who is already in your Circle. Circle requests must be accepted before the connection becomes mutual. If a plan owner reserves a seat by email, the invited person must register with that confirmed email address to claim it.</p>
        <p>You must be at least 18 to create or use an account, including an account created to receive a Jar or claim an invited seat. The account flow is intended to require confirmation with an unticked checkbox; we do not plan to ask for your full date of birth by default.</p>
      </section>

      <section>
        <h2>3. Plans and Jars</h2>
        <p>We intend to accept purchases globally where our payment provider supports the customer and applicable law permits. The confirmed product model is a one-time purchase, not a subscription. Plans contain 1, 2, 3, 5, or 10 account seats; each purchased seat receives 10 Jars. Extra Jar credits are separate one-time purchases owned by the seat that buys them. Unused credits do not expire while that account remains active.</p>
        <p>At paid launch, prices will be displayed before applicable tax, which checkout will calculate and add. There is no automatic renewal or future charge. Live checkout is not enabled: the current Dodo Test Mode creates test entitlements and does not collect real payments.</p>
      </section>

      <section>
        <h2>4. Hosting and availability</h2>
        <p>Each paid Jar is planned to expire three years after it is received by its recipient, when it becomes available to them in the service. The period applies to that Jar only; it does not expire the recipient’s account or their other Jars. Hosting cannot be extended. Before expiry, the recipient will be able to download a keepsake copy, and we plan to send one email reminder seven days before expiry.</p>
        <p>The current system records a hosting end date when the creator seals the Jar, at the same time it becomes available to the recipient. Automatic expiry removal, keepsake downloads, and the expiry email are not implemented yet. These are intended paid-launch rules, not features currently available in the pre-launch service.</p>
      </section>

      <section>
        <h2>5. Your content</h2>
        <p>You keep ownership of content you create. You give Open When Jar permission to host, process, reproduce, and deliver that content only as needed to operate, secure, maintain, and provide the service to you and the people you authorise.</p>
        <p>You must have the necessary rights and permissions for anything you upload, including another person’s photograph, voice, or personal information. Do not upload unlawful, threatening, abusive, exploitative, deceptive, privacy-invasive, infringing, malicious, or dangerous content.</p>
        <p>Open When Jar may restrict or remove content or access where reasonably necessary to protect users, comply with law, investigate abuse, or secure the service. A formal reporting and appeal channel will be published before public launch.</p>
      </section>

      <section>
        <h2>6. Private sharing has limits</h2>
        <p>We use access controls to limit who can open a Jar, but an authorised recipient can take screenshots, make recordings, download available material, or share what they have received. Open When Jar cannot retrieve copies already saved by another person.</p>
        <p>The service is not end-to-end encrypted. Read the <Link href="/privacy">Privacy Notice</Link> for a plain-language explanation of how content is processed.</p>
      </section>

      <section>
        <h2>7. Acceptable use</h2>
        <p>You must not attempt to access another person’s account or content, bypass an unlock date or allowance, probe or disrupt the service, distribute malware, scrape user information, impersonate another person, use the service for spam, or use it in a way that violates another person’s rights or applicable law.</p>
      </section>

      <section>
        <h2>8. Pre-launch availability</h2>
        <p>The pre-launch service is provided for development and testing. It may be interrupted, reset, modified, or withdrawn. Do not rely on it as the only copy of important content. No live purchase or paid hosting commitment exists until production checkout is enabled and final purchase terms are displayed before payment.</p>
      </section>

      <section>
        <h2>9. Refunds</h2>
        <p>The service currently does not accept live payments. The pre-launch payment status and items that still need to be settled before live sales are explained in the <Link href="/refund-policy">Refund Policy</Link>.</p>
      </section>

      <section>
        <h2>10. Changes and missing launch terms</h2>
        <p>The intended governing law is the law of India, while preserving consumer rights that cannot be waived under the law applicable to you. A dispute may be brought in a forum permitted by applicable law; this draft does not choose an exclusive local court. This is a pre-launch draft and needs review for the countries where the service will be offered.</p>
        <p>We may revise these terms as the product develops. Before paid launch, we still need to confirm the legal seller identity and any required address details, publish working support and privacy contacts, and finalize legally required warranty, liability, deletion, and expiry wording.</p>
      </section>
    </LegalPage>
  );
}
