import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy notice — Open When Jar",
  description: "How Open When Jar handles account details, personal messages, photos, voice notes, invitations, and service data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your memories deserve care"
      title="Privacy notice"
      summary="This notice explains what Open When Jar handles when you create an account, connect with your Circle, and make or receive a Jar."
    >
      <section>
        <h2>1. What we collect</h2>
        <p>We handle the information you provide and the information needed to run the service:</p>
        <ul>
          <li><strong>Account information:</strong> email address, username, display name, authentication identifiers, and account timestamps.</li>
          <li><strong>Circle and invitation information:</strong> connection requests, Circle membership, and email addresses entered by a plan owner to reserve and invite additional seats.</li>
          <li><strong>Jar content:</strong> cover notes, letter text, prompts, themes, photos, voice recordings, unlock dates, recipient details, and favourite or opened state.</li>
          <li><strong>Plan and service records:</strong> selected plan, seat membership, Jar allowance, hosting dates, and lifecycle status.</li>
          <li><strong>Technical information:</strong> authentication cookies and operational information that our hosting, authentication, and security providers may process, such as IP address, browser details, request time, and error information.</li>
        </ul>
        <p>The service does not currently use advertising trackers, session replay, or third-party behavioral analytics.</p>
      </section>

      <section>
        <h2>2. How we use information</h2>
        <p>We use this information to create and secure accounts, keep users signed in, connect accepted Circle members, reserve invited seats, create and deliver Jars, enforce unlock dates and allowances, host private media, prevent misuse, diagnose failures, and operate the service.</p>
        <p>We do not sell personal information. We do not use private Jar content for advertising.</p>
      </section>

      <section>
        <h2>3. Who can see your information</h2>
        <p>Your username and display name can be shown to other signed-in users where needed for Circle requests, invitations, and Jar delivery. A Jar is available only to its creator and its authorised recipient or recipients, subject to its state and unlock date.</p>
        <p>A plan owner can see the email addresses they entered for unclaimed seat invitations. Other plan members do not receive that invitation list.</p>
        <p>Authorised recipients may save, screenshot, record, or otherwise copy content they can access. Copies made by another person cannot be remotely erased by Open When Jar.</p>
      </section>

      <section>
        <h2>4. Service providers</h2>
        <p>Supabase provides authentication, database, and private file storage; the active project stores its primary project data in Singapore. Vercel is planned for application hosting but has not been deployed yet; Singapore (<code>sin1</code>) is the planned Functions region, and we will verify the live setting after deployment. Google processes sign-in information if you choose Google sign-in. Resend is used for plan-seat invitation email when production email settings are enabled.</p>
        <p>Development checkout sends account email, display name, and selected product details to Dodo Payments Test Mode. Dodo collects any billing information entered in its hosted sandbox checkout and processes simulated transaction data. Live payments are not enabled. We still need to confirm Google, Resend, and Dodo processing locations, terms, and any cross-border transfer details before paid launch.</p>
      </section>

      <section>
        <h2>5. Cookies, browser storage, and notifications</h2>
        <p>We use authentication cookies to maintain signed-in sessions. The notification feature stores read and seen notification identifiers and your desktop-alert preference in your browser’s local storage. If your browser supports desktop notifications, the service worker is registered for that feature. Desktop alerts require your separate browser permission and appear while Open When Jar is open; closed-browser Web Push is not enabled. You can turn alerts off in the app or browser settings.</p>
        <p>We do not currently use advertising cookies or third-party behavioral analytics. If we add optional tracking technologies, this notice and any required choice mechanism will be updated first.</p>
      </section>

      <section>
        <h2>6. Storage, security, and encryption</h2>
        <p>Access controls and database row-level security restrict private records, and uploaded files are stored in private storage. Media is served only after an access check.</p>
        <p>Open When Jar is <strong>not end-to-end encrypted</strong>. The backend and infrastructure providers must be able to process readable content to store and deliver it, enforce access and dates, and operate backups and security controls. Restricted infrastructure administrators may technically be able to access stored data. No online service can guarantee absolute security.</p>
      </section>

      <section>
        <h2>7. Retention and deletion</h2>
        <p>The current system records a hosting end date when a creator seals a Jar and makes it available to its recipient. The planned paid-launch rule is to expire each paid Jar three years after that recipient receives it, remove its live content at expiry, let the recipient download a keepsake copy beforehand, and send one email reminder seven days before expiry. Automatic removal, keepsake downloads, and expiry emails are not available yet. Creators can currently delete their own drafts; account deletion and a complete data export are not available.</p>
        <p>Encrypted backup copies of live content are planned to expire through normal rotation no later than 30 days after live deletion. Payment and accounting records will be kept separately for periods required by law. The account-deletion workflow and final backup-retention operations still need implementation before paid launch.</p>
      </section>

      <section>
        <h2>8. Your choices</h2>
        <p>You can choose what personal content to place in a Jar, remove attachments before saving, delete your own drafts, decline Circle requests, and cancel an unclaimed seat invitation if you are the plan owner. Browser microphone permission can be refused; writing and photo features remain available.</p>
      </section>

      <section>
        <h2>9. Privacy requests and contact</h2>
        <p>Depending on the law that applies to you, you may have rights to ask about, access, correct, export, or delete personal information. Signed-in users can submit these requests from the Account section. The signed-in session identifies the account; an email alone will not authorize an account change. Requests are handled manually through separate request queues in the Admin Portal, with a target to complete or fulfill them within 3–4 calendar days.</p>
        <p>Account deletion is disabled and a complete export is not implemented. There is no public support email yet. The support email intake requires a mailbox provider and verified webhook configuration before it can receive messages; until a public address is published, signed-in users can use the Account request form. We will publish the legal seller identity, any required address details, working privacy and support contacts, request steps, and country-specific disclosures before paid launch.</p>
      </section>

      <section>
        <h2>10. Changes</h2>
        <p>We may update this notice as the service changes. A revised version will show its latest update date. Also read our <Link href="/terms">Terms of Use</Link> and <Link href="/refund-policy">Refund Policy</Link>.</p>
      </section>
    </LegalPage>
  );
}
