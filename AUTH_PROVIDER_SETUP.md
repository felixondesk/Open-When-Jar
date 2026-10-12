# Open When Jar — Google Login and Production Email Setup

Last reviewed: 26 September 2026

Current check: the Supabase Auth settings endpoint reports Google enabled. A local browser completed the Google redirect and reached the username-onboarding page on 26 September. Username submission, returning login, cancellation, and collision handling still need flow checks. The setup steps below remain a reference for reviewing or changing provider configuration.

Never paste an OAuth secret, Resend API key, database password, or Supabase secret key into this repository or chat. Enter provider secrets directly in the provider dashboards.

## Google login — what Felix needs to do

Codex has implemented the Google button, OAuth callback, and first-login username selection screen. The provider must now be enabled.

### 1. Create the Google OAuth app

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview) and select or create the Google Cloud project for Open When Jar. If Google asks you to configure the project first, continue to the Auth Platform setup.
2. Open **Branding**.
3. Set the app name to **Open When Jar**, add the user-support email, and add the developer contact email.
4. Under **Audience**, use **External**. While testing, add the exact Gmail accounts that will test the app.
5. Under **Data Access**, request only the basic `openid`, email, and profile scopes.
6. Open **Clients → Create client → Web application**.

### 2. Enter the allowed URLs

Google has two different URL lists. An **authorised JavaScript origin** is only the scheme + host where the app runs; an **authorised redirect URI** is the complete callback URL that receives Google's response. Do not put the callback path in the origin field.

For development, add these authorised JavaScript origins:

- `http://localhost:3127`
- `https://saplipdgsbpwlgxyhxjg.supabase.co`

Add this exact authorised redirect URI:

- `https://saplipdgsbpwlgxyhxjg.supabase.co/auth/v1/callback`

When the production domain is selected, add its HTTPS origin as another authorised JavaScript origin. Do not replace the Supabase callback URI.

Google's own [web-server OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server?authuser=2) requires redirect URIs to match exactly, including `https`, the hostname, path, and trailing-slash choice.

### 3. Connect Google to Supabase

1. Copy the Google **Client ID** and **Client secret**.
2. In the Supabase project, open **Authentication → Sign In / Providers → Google**.
3. Enable Google, paste the Client ID and secret, and save.
4. Open **Authentication → URL Configuration**.
5. During development, set/add:
   - Site URL: `http://localhost:3127`
   - Redirect URL: `http://localhost:3127/auth/callback`
   - If signing up through the LAN address, also add `http://192.168.0.6:3127/auth/callback` to Redirect URLs. The browser opening the confirmation link must be able to reach the same address used for signup.
6. At the final domain step, change the Site URL to the production HTTPS URL and add `https://<production-domain>/auth/callback` to the redirect allow list.

### What Codex needs from Felix

No secret needs to be shared. After the setup is saved, tell Codex only:

- Google provider is enabled.
- The Gmail addresses to use as Google test users are allowed in Google's testing audience.
- Whether the app is still in Google testing mode or has been published.

Codex can then test new Google signup, username selection, returning login, cancellation, and collision handling.

## Production authentication email

Supabase Auth should continue to generate confirmation, login, and password-reset messages. Supabase's built-in delivery service is suitable only for development and is heavily restricted; production should use custom SMTP.

For manual signup testing before custom SMTP is configured, use an email address on the Supabase project's team. The built-in mail service does not deliver confirmation emails to arbitrary addresses. An address that already signed up with Google will not receive a new confirmation email from email/password signup; use Google sign-in for that account.

After changing the redirect allow list or the app's callback handling, create a fresh signup and use its new confirmation link. Previously issued links keep their old `redirect_to` address, and PKCE verification codes are single use. Do not use `0.0.0.0` as a browser URL; it is a server bind address.

For a new email/password signup, the confirmation link returns to `/auth/confirm`. After verification, the app ends only that confirmation session and opens `/auth?verified=1`, where the user sees the verified message and signs in. Google uses `/auth/callback` and continues to `/app`. Both `/auth/confirm` URLs must be added to Supabase Redirect URLs alongside the existing Google callback URLs.

Password recovery starts at `/auth/forgot-password` and uses the existing `/auth/confirm` callback. Keep that exact callback URL in **Authentication → URL Configuration → Redirect URLs** for every app origin used to request a reset. The callback sends verified recovery sessions to `/auth/reset-password` while ordinary signup confirmation still returns to sign-in. Open the email link in the same browser used to request it so the PKCE code verifier is available. The in-account password form is shown to email/password accounts and asks for the current password.

**Chosen provider:** Resend through Supabase custom SMTP.

### What authentication email is used for

Email is only the account-security channel. Open When Jar does **not** use email to find a recipient or send a jar; users add one another by unique username.

- **Account confirmation:** verifies that a new email address belongs to the person creating the account.
- **Password recovery:** sends a one-time link when someone forgets a password.
- **Admin sign-in:** delivers the one-time code used by the protected admin portal.
- **Security notices:** gives us a trusted channel for important account or security messages.

Google sign-in can reduce the number of password and confirmation steps, but an email address is still stored by Supabase Auth for account recovery and security operations.

### What Felix needs to do

1. Wait until the production domain is selected, then open [Resend sign-up](https://resend.com/signup).
2. Create the Resend account with Google, GitHub, or an email/password. Use an account you control; do not share its password with Codex.
3. In Resend, open **Domains → Add Domain**, enter the production domain, and add every DNS record Resend shows at your DNS host. Wait for the domain status to become **Verified**.
4. Create a Resend API key from **API Keys** with sending permission only. Copy it once into your password manager; never put it in this repository or chat.
5. In Supabase, open **Authentication → Email → SMTP Settings** and enable custom SMTP.
6. Enter:
   - Sender name: `Open When Jar`
   - Sender email: `hello@<production-domain>` or `accounts@<production-domain>`
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: the Resend API key
7. Disable link tracking for authentication messages so confirmation and recovery links are not rewritten.
8. Send a test confirmation, password-reset message, and admin OTP. Verify delivery, spam placement, and that each link/code completes the intended flow.

After custom SMTP is working, review Supabase's authentication email rate limit before launch and raise it only to a reasonable level for expected traffic.

The current Supabase organization is on the Free plan. Its default Auth mailer is restricted, and leaked-password protection is a **Pro plan (or higher)** setting. Upgrade the organization before launch, then enable it in **Authentication → Sign In / Providers → Email password settings**.
