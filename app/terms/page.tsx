import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of use — Open When Jar",
  description: "The rules for using Open When Jar: accounts, Jars, purchases, hosting, content, and liability.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="A thoughtful space, shared responsibly"
      title="Terms of use"
      summary="These terms are an agreement between you and Open When Jar. By creating an account or using the service you accept them."
    >
      <section>
        <h2>1. The service</h2>
        <p>Open When Jar lets registered users write private letters, add photographs and voice recordings, organise them into digital Jars, and send them to people in their accepted Circle. Recipients can open available letters, keep their own favourites and opening state, and download a keepsake copy before hosting ends.</p>
        <p>Open When Jar is operated by an independent developer and is a personal-gifting service. It does not provide therapy, medical advice, or emergency assistance. You can reach us at <a href="mailto:hello@openwhenjar.bond">hello@openwhenjar.bond</a>.</p>
      </section>

      <section>
        <h2>2. Accounts, eligibility, and Circle connections</h2>
        <p>You must be at least 18 to create or use an account, including an account created to receive a Jar or claim an invited seat. You confirm this with a checkbox when you sign up; we do not ask for your date of birth.</p>
        <p>You are responsible for providing accurate account information, protecting your sign-in credentials, and activity performed through your account. Usernames must follow the displayed format and cannot be changed after they are finalised.</p>
        <p>A Jar can be sent only to someone who is already in your Circle. Circle requests must be accepted before the connection becomes mutual. If a plan owner reserves a seat by email, the invited person must register with that confirmed email address to claim it.</p>
      </section>

      <section>
        <h2>3. Plans, Jars, and purchases</h2>
        <p>Plans are one-time purchases, not subscriptions. There is no automatic renewal or future charge. Plans contain 1, 2, 3, 5, or 10 account seats; each purchased seat receives 10 Jars. Extra Jar credits are separate one-time purchases owned by the seat that buys them. Unused credits do not expire while that account remains active.</p>
        <p>Purchases are sold and processed by Dodo Payments, which acts as Merchant of Record. Dodo is the legal seller of record on your receipt and card statement, collects your payment and billing details, and calculates and adds applicable tax at checkout. Prices shown in the app are before tax. Open When Jar grants your plan or credit after Dodo confirms payment.</p>
        <p>Refunds are described in the <Link href="/refund-policy">Refund Policy</Link>.</p>
      </section>

      <section>
        <h2>4. Hosting period</h2>
        <p>Each sealed Jar is hosted for three years from the moment it becomes available to its recipient. The period applies to that Jar only; it does not affect the recipient’s account or their other Jars. Hosting cannot be extended. The hosting end date is shown on the Jar, and the recipient can download a keepsake copy of the available letters, photos, and voice notes at any time before it. We send the recipient one email reminder seven days before hosting ends. After the end date, the Jar’s content is no longer accessible and is deleted.</p>
        <p>Opening dates and browser notifications are convenience features. Delivery can be delayed by browsers, devices, or network providers.</p>
      </section>

      <section>
        <h2>5. Your content</h2>
        <p>You keep ownership of content you create. You give Open When Jar permission to host, process, reproduce, and deliver that content only as needed to operate, secure, maintain, and provide the service to you and the people you authorise.</p>
        <p>You must have the necessary rights and permissions for anything you upload, including another person’s photograph, voice, or personal information. Do not upload unlawful, threatening, abusive, hateful, sexually exploitative, deceptive, privacy-invasive, infringing, malicious, or dangerous content.</p>
        <p>Open When Jar may restrict or remove content or access where reasonably necessary to protect users, comply with law, investigate abuse, or secure the service. To report content or appeal a decision, use the request form in your Account section or email <a href="mailto:hello@openwhenjar.bond">hello@openwhenjar.bond</a>. We aim to respond within 4 calendar days.</p>
      </section>

      <section>
        <h2>6. Private sharing has limits</h2>
        <p>We use access controls to limit who can open a Jar, but an authorised recipient can take screenshots, make recordings, download available material, or share what they have received. Open When Jar cannot retrieve copies already saved by another person.</p>
        <p>The service is not end-to-end encrypted. Read the <Link href="/privacy">Privacy Notice</Link> for a plain-language explanation of how content is processed.</p>
      </section>

      <section>
        <h2>7. Acceptable use</h2>
        <p>You must not attempt to access another person’s account or content, bypass an unlock date or allowance, probe or disrupt the service, distribute malware, scrape user information, impersonate another person, use the service for spam, or use it in a way that violates another person’s rights or applicable law. We may suspend or close accounts for abuse, fraud, security threats, or legal compliance.</p>
      </section>

      <section>
        <h2>8. Closing your account</h2>
        <p>You can ask us to delete your account from the Account section. Deletion removes your profile, drafts, unused credits, and Circle connections. Jars you have already sent stay available to their recipients until their hosting end date, because they were delivered as gifts; tell us in your request if you also want a specific sent Jar removed. Deletion cannot be undone, and no refund is due for unused credits unless the Refund Policy says otherwise.</p>
      </section>

      <section>
        <h2>9. Warranty and liability</h2>
        <p>The service is provided “as is” and “as available”. We work to keep it running and your content safe, but we do not promise uninterrupted or error-free operation. Keep your own copies of anything important, and download keepsakes before hosting ends.</p>
        <p>To the extent permitted by law, Open When Jar is not liable for indirect, incidental, or consequential loss, or for loss of content caused by events outside our reasonable control. Our total liability for any claim is limited to the amount you paid for the service in the 12 months before the claim. Nothing in these terms limits liability that cannot be limited under the law that applies to you, including your statutory consumer rights.</p>
        <p>You agree to cover reasonable losses we suffer because you uploaded content you had no right to upload or used the service in breach of these terms.</p>
      </section>

      <section>
        <h2>10. Governing law and changes</h2>
        <p>These terms are governed by the laws of India. If you are a consumer, you also keep any rights under the law of your own country that cannot be waived by agreement, and you may bring a claim in a forum permitted by that law.</p>
        <p>We may revise these terms as the product develops. Material changes will be announced in the app or by email before they take effect, and the latest update date is shown at the top of this page. Continuing to use the service after a change means you accept the revised terms.</p>
      </section>
    </LegalPage>
  );
}
