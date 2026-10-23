import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy notice — Open When Jar",
  description: "How Open When Jar handles account details, personal messages, photos, voice notes, invitations, payments, and service data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your memories deserve care"
      title="Privacy notice"
      summary="This notice explains what Open When Jar handles when you create an account, connect with your Circle, buy a plan, and make or receive a Jar."
    >
      <section>
        <h2>1. What we collect</h2>
        <p>We handle the information you provide and the information needed to run the service:</p>
        <ul>
          <li><strong>Account information:</strong> email address, username, display name, authentication identifiers, your age confirmation, and account timestamps.</li>
          <li><strong>Circle and invitation information:</strong> connection requests, Circle membership, and email addresses entered by a plan owner to reserve and invite additional seats.</li>
          <li><strong>Jar content:</strong> cover notes, letter text, prompts, themes, photos, voice recordings, unlock dates, recipient details, hosting end dates, and favourite or opened state.</li>
          <li><strong>Purchase records:</strong> the plan or credit you bought, price, currency, payment status, and the payment identifiers Dodo Payments sends us. We never receive or store your card number.</li>
          <li><strong>Support requests:</strong> the category and text of requests you submit from the Account section, our replies, and emails you send to our support address.</li>
          <li><strong>Technical information:</strong> authentication cookies and operational information that our hosting, authentication, and security providers process, such as IP address, browser details, request time, and error information.</li>
        </ul>
        <p>We do not use advertising trackers, session replay, or third-party behavioral analytics.</p>
      </section>

      <section>
        <h2>2. How we use information</h2>
        <p>We use this information to create and secure accounts, keep users signed in, connect accepted Circle members, reserve invited seats, grant purchased plans and credits, create and deliver Jars, enforce unlock dates and allowances, host private media, send the emails described below, answer support requests, prevent misuse, diagnose failures, and operate the service.</p>
        <p>We do not sell personal information. We do not use private Jar content for advertising. Email addresses are never used to find or address Jar recipients; delivery is by username within an accepted Circle.</p>
      </section>

      <section>
        <h2>3. Who can see your information</h2>
        <p>Your username and display name can be shown to other signed-in users where needed for Circle requests, invitations, and Jar delivery. A Jar is available only to its creator and its authorised recipients, subject to its state and unlock date.</p>
        <p>A plan owner can see the email addresses they entered for unclaimed seat invitations. Other plan members do not receive that invitation list.</p>
        <p>The operator uses a separate admin portal, protected by multi-factor authentication, to run the service. It shows account and Jar metadata such as usernames, plan status, dates, and the text of support requests. It never shows letter text, photos, voice notes, or email addresses.</p>
        <p>Authorised recipients may save, screenshot, record, or otherwise copy content they can access. Copies made by another person cannot be remotely erased by Open When Jar.</p>
      </section>

      <section>
        <h2>4. Service providers</h2>
        <p>We share information only with the providers needed to run the service:</p>
        <ul>
          <li><strong>Supabase</strong> provides authentication, the database, and private file storage. Project data is stored in Singapore.</li>
          <li><strong>Vercel</strong> hosts the application, with server functions running in Singapore.</li>
          <li><strong>Cloudflare Turnstile</strong> protects the sign-in, sign-up, and admin login forms from automated abuse. It processes your IP address and browser signals to decide whether a request is human and may set a cookie inside its challenge frame.</li>
          <li><strong>Google</strong> processes your sign-in information if you choose Google sign-in.</li>
          <li><strong>Resend</strong> delivers our emails: account verification and password links, plan-seat invitations, and hosting-end reminders.</li>
          <li><strong>Dodo Payments</strong> is the Merchant of Record for purchases. Checkout sends Dodo your account email, display name, and the selected product. Dodo collects your billing and payment details on its own checkout page under its own privacy policy and sends us confirmation of payment.</li>
        </ul>
        <p>Some of these providers process data outside your country, including in Singapore, the United States, and the European Union. We rely on their standard contractual safeguards for those transfers.</p>
      </section>

      <section>
        <h2>5. Cookies, browser storage, and notifications</h2>
        <p>We use authentication cookies to maintain signed-in sessions. The notification feature stores read and seen notification identifiers and your desktop-alert preference in your browser’s local storage. If your browser supports desktop notifications, the service worker is registered for that feature. Desktop alerts require your separate browser permission and appear while Open When Jar is open; closed-browser Web Push is not enabled. You can turn alerts off in the app or browser settings.</p>
        <p>We do not use advertising cookies or third-party behavioral analytics, so no cookie consent banner is shown. If we add optional tracking technologies, this notice and any required choice mechanism will be updated first.</p>
      </section>

      <section>
        <h2>6. Storage, security, and encryption</h2>
        <p>Access controls and database row-level security restrict private records, and uploaded files are stored in private storage. Media is served only after an access check. Data is encrypted in transit and at rest by our providers.</p>
        <p>Open When Jar is <strong>not end-to-end encrypted</strong>. The backend and infrastructure providers must be able to process readable content to store and deliver it, enforce access and dates, and operate backups and security controls. Restricted infrastructure administrators may technically be able to access stored data. No online service can guarantee absolute security.</p>
        <p>If a security breach affects your personal information, we will notify you by email and inform the authorities where the law requires it.</p>
      </section>

      <section>
        <h2>7. Retention and deletion</h2>
        <p>Each sealed Jar is hosted for three years from the moment it becomes available to its recipient. The recipient can download a keepsake copy before then and receives one email reminder seven days before hosting ends. At the end date the Jar’s content becomes inaccessible and is deleted. Creators can delete their own drafts at any time.</p>
        <p>Account information is kept while your account is active. When your account is deleted, your profile, drafts, unused credits, and Circle connections are removed; Jars you already sent remain with their recipients until their own hosting end date unless you ask for a specific Jar to be removed.</p>
        <p>Encrypted backup copies expire through normal rotation no later than 30 days after live deletion. Security and application logs are kept for 90 days unless an incident requires longer. Purchase records are kept for the period required by tax and accounting law.</p>
      </section>

      <section>
        <h2>8. Your choices</h2>
        <p>You can choose what personal content to place in a Jar, remove attachments before saving, delete your own drafts, decline Circle requests, and cancel an unclaimed seat invitation if you are the plan owner. Browser microphone permission can be refused; writing and photo features remain available.</p>
      </section>

      <section>
        <h2>9. Your rights and how to contact us</h2>
        <p>Depending on the law that applies to you, you may have rights to ask about, access, correct, export, or delete your personal information, and to complain to a data protection authority. Signed-in users can submit these requests from the Account section; the signed-in session identifies the account, so an email alone will not authorise an account change. You can also write to <a href="mailto:hello@openwhenjar.bond">hello@openwhenjar.bond</a>, which is our privacy, support, and grievance contact. We aim to complete requests within 4 calendar days.</p>
        <p>Open When Jar is operated by an independent developer. Purchases are sold by Dodo Payments as Merchant of Record, so Dodo’s details appear on receipts and card statements.</p>
      </section>

      <section>
        <h2>10. Changes</h2>
        <p>We may update this notice as the service changes. A revised version will show its latest update date at the top of this page, and material changes will be announced in the app or by email. Also read our <Link href="/terms">Terms of Use</Link> and <Link href="/refund-policy">Refund Policy</Link>.</p>
      </section>
    </LegalPage>
  );
}
