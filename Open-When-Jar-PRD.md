# Open When Jar — Product Requirements Document

Version 1.0 · 20 September 2026 · Product owner: Felix

Status: Detailed product proposal, ready for design and implementation planning. This document specifies the intended product; it is not evidence of an implemented, tested, or security-certified application. Product name and example domains remain working names.

## 1. Product promise

**Give someone your words for the moments you cannot be beside them.**

Open When Jar is a personal digital gift. A person fills a jar with messages, photographs, and short voice recordings, labelled with moments such as “Open when you miss me.” They choose up to ten registered recipients, pay once for the jar size, and send it by username. Each recipient opens envelopes privately whenever they need them and keeps their own favourites and opening progress.

The product should feel like opening handwritten letters from someone familiar. A visitor should understand the central promise quickly without reading a feature list.

The first release is a mobile-first website, with optional home-screen installation. Both creation and receiving work on desktop too. The initial audience is adults buying gifts for partners, family, or close friends, especially those living apart. The product is for ordinary affection and connection; it does not offer therapy or emergency support.

## 2. Goals and boundaries

### Product goals

- Make it possible to create a meaningful gift in one sitting, with a first envelope completed within two minutes.
- Make the recipient's first visit clear: understand who the verified gift is from, open an envelope, and know how to return.
- Protect private content from forwarded invitations, unauthorized accounts, accidental previews, and early access to scheduled messages.
- Deliver an attractive, recognizable experience on an ordinary phone and mobile connection.
- Support a one-time purchase with predictable limits and manageable operations for a founder with a full-time job.

### Release-one scope

One creator, one to ten recipients, one jar-size purchase. Text, images, short voice messages, optional unlock dates, three themes, recipient libraries, personal favourites and opening progress, private username delivery, payment recovery, keepsake export, deletion, and essential support tools.

### Outside release one

Video, AI-written letters, relationship profiles, public feeds, collaborative authoring, comments, chat, recipient mood tracking, streaks, push notifications, subscriptions, native app-store releases, custom drawing tools, background music, and live collaboration.

These boundaries preserve the main experience. An elegant envelope-opening interaction has higher priority than additional settings.

## 3. Personas and jobs to be done

| Person | Situation | What they need | Main friction to remove |
|---|---|---|---|
| Partner living apart | Wants a gift more personal than a generic card | Put their own words and voice into a lasting gift | A blank editor and too many design choices |
| Adult child or parent | Wants to remain emotionally close across distance | Record a familiar voice and add shared photos | Complicated installation, passwords, small controls |
| Close friend | Wants to support a friend through an ordinary difficult week | Create three or four thoughtful envelopes quickly | Feeling obliged to write long messages |
| Recipient | Receives an unexpected invitation | Safely open it, understand the contents, return later | Unclear sender, registration forms, payment prompts |

Primary job: “Help me give someone a personal gift they can open when they need it.”

Recipient job: “Help me find a comforting message from my person without making me organize anything.”

## 4. Working decisions and commercial assumptions

The following defaults make the PRD actionable. They are proposed product decisions, not previously agreed purchase terms.

| Decision | Release-one proposal | Reason |
|---|---|---|
| Platform | Responsive web app; optional PWA installation | Invitations open directly on phones |
| Price | **One Heart** $7.99/1, **Two Hearts** $14.99/2, **Close Circle** $19.99/3, **Family Circle** $29.99/5, **Big Heart** $49.99/10; one-time | Clear recipient limits with progressively lower per-person pricing |
| Payment provider | Dodo Payments, subject to merchant and product approval | Global checkout and merchant-of-record service |
| Tax display | Base price explicitly marked “plus applicable tax”; final total before confirmation | Prevent surprise deductions or misleading prices |
| Localization | English interface; Unicode messages in any language | Limit translation scope without restricting personal expression |
| Recipient access | Invitation plus verification of the email specified by the creator | A forwarded link alone must not reveal messages |
| Hosting promise | **Three years from successful purchase**, with the expiry date shown before paying | Bound the ongoing hosting obligation |
| Keepsake | Recipient can download currently unlocked contents; full export after the last unlock | Preserve memories without defeating scheduled envelopes |
| Future dates | At most 365 days after sealing | Every envelope unlocks well before hosting ends |
| Post-seal changes | Contents and unlock dates are immutable; delivery address can be corrected before claim | Preserve the gift as it was purchased and previewed |
| Recipient insights | No individual open timestamps, mood history, or listening activity shared with creator | Avoid turning affection into surveillance |

No claim of “forever online.” Local keepsake copies can be kept independently of the service. No automatic renewal or automatic future charge. Any future paid hosting extension requires a separate product decision and explicit purchase.

Charging in USD does not guarantee USD bank payouts. Payout currency, fees, supported countries, refunds, and seller eligibility must be verified with Dodo during onboarding. Earlier fee calculations are illustrative, not contractual.

## 5. End-to-end experience

### 5.1 First visit

The landing page opens with one jar illustration and the headline:

> A little jar of you, for someone you love.

Supporting text: “Fill it with letters, photos, and your voice. They open each one when they need you.”

Primary action: **Make a jar**. Secondary action: **Open a sample**.

The sample contains clearly fictional messages. It lets visitors open an envelope and hear an optional short recording before signing in. Price and the three-year hosting term appear on the landing page, not only at checkout.

### 5.2 Create

1. Enter the recipient's preferred name. Do not request relationship category, birthdate, or address.
2. Choose the first “Open when…” prompt, or write a custom label.
3. Write a message. Optional photo and voice actions sit beside the editor.
4. At the first explicit save, ask for the creator's email and verify it with a code. Ask “What name should they see?” once, with a 60-character limit; email verification does not verify someone's real-world name. Keep current unsaved work in the active page while verification completes.
5. Save the draft, then return to the envelope without repeating onboarding.
6. Add more envelopes; three is a helpful suggestion, not a requirement. One complete envelope is enough to buy.
7. Choose a jar theme and an optional cover note.
8. Preview the exact recipient layout, clearly labelled **Your preview**.
9. Enter the recipient's email. Explain: “Only this email can claim your jar. We won't email them until you choose to send it.”
10. Review contents, hosting term, recipient details, and purchase price. Pay once.
11. After confirmed payment, the jar is sealed and ready. Show **Copy gift link** and **Share gift**. Email delivery is a separate explicit action.

No background invitation is sent during drafting, checkout, or payment recovery. The creator controls when the surprise happens.

### 5.3 Receive

1. Tap the shared invitation. The unverified page says **A jar is waiting for you** and shows generic artwork.
2. Tap **Open my gift**, enter an email, and request a code. Do not reveal the recipient's expected address, names, cover note, or envelope titles before verification.
3. Verify the code. If the identity matches the intended recipient, claim the jar and create the minimum account needed for future access. Explain “We'll save your jar so you can come back”; no password or profile setup.
4. Reveal **[Creator name] made this for you**, the personalized jar, and cover note.
5. Tap **Explore your envelopes**. Choose an available envelope by its label.
6. The envelope opens once with a brief animation. Display text first, then photo and voice controls. Audio plays only when tapped.
7. Close back to the same position in the jar. Already-opened envelopes stay alongside the others, with a subtle opened indicator.
8. After the first meaningful opening, offer **Keep this jar handy** with home-screen or browser-bookmark guidance. It is dismissible and never blocks content.

A valid remembered session avoids repeated verification. A different device or expired session requires email verification again. An account dashboard provides access if the original invitation is lost.

### 5.4 Return

Recipients see a small shelf of their jars. Opening a jar defaults to **All envelopes**, with **Available now** and **Favourites** as simple filters. Newly eligible date envelopes receive a quiet “Ready to open” label. The app never infers how the recipient feels.

## 6. Information architecture and screens

Public areas: landing page, jar-size and hosting explanation, support/contact, privacy, terms, refund policy, and sign-in.

Creator areas: My jars → draft builder → recipient preview → review/payment → delivery screen → jar details.

Recipient areas: verify invitation → gift reveal → jar/envelope reader → My jars → keepsake export/settings.

Shared account areas: email, sessions, export requests, delete account, support.

| Screen | Main content | Primary action | Required edge states |
|---|---|---|---|
| Landing | Interactive example, promise, visible price | Make a jar | Example animation unavailable; static fallback |
| My jars | Created/received tabs; drafts and sealed gifts | Make a jar / Open jar | Empty shelf, loading, retry, hosting ended |
| Envelope builder | Prompt, text, optional attachments, save status | Save envelope | Unsaved, saving, failed, conflict, limit reached |
| Voice recorder | Record, timer, preview, replace | Use recording | Permission denied, interruption, unsupported format |
| Theme/cover | Three theme thumbnails; live small preview | Preview gift | Image failure without blocking text |
| Review | Envelope count, recipient email, price, hosting date | Seal and pay | Missing email, processing attachment, changed draft |
| Payment return | Server-confirmed order state | Share gift / Check payment | Pending, failed, paid but sealing pending |
| Delivery | Generic link, selected theme thumbnail, email action | Share gift | Share unavailable, email bounced, copied confirmation |
| Invitation | Generic waiting state | Open my gift | Invalid, expired, revoked; no private disclosure |
| Claim | Email/code fields and clear recovery | Verify and open | Wrong account, expired code, cooldown, email delayed |
| Jar | Cover and labelled envelopes | Open chosen envelope | All locked, no available media, unavailable jar |
| Reader | Comfortable letter, photo, optional audio | Play voice / Back to jar | Media retry, revoked session, reduced motion |
| Export | Included content and download explanation | Download keepsake | Locked exclusions, building, failed, expired download |

Every loading state must either end in usable content or offer a clear retry. Never spin indefinitely or replace a failed request with an empty jar.

## 7. Functional requirements

Priority **P0** means required for a paid launch. **P1** means useful after the core experience is stable. All requirements below are P0 unless specified.

### CRE — Drafts and composition

- **CRE-01:** Authenticated creators can create, resume, rename, and delete their own drafts. Maximum three active drafts per creator initially.
- **CRE-02:** Provide six prompts: miss me, rough day, need a laugh, need encouragement, cannot sleep, birthday. Add a custom label up to 80 characters.
- **CRE-03:** Each envelope accepts up to 3,000 Unicode characters, one image, and one voice clip. At least one of text/image/audio must be present; captions are encouraged.
- **CRE-04:** A jar permits 10 envelopes, 10 images, five voice clips of up to 60 seconds each, and at most 50 MB of processed media in total.
- **CRE-05:** Save edits after a short idle interval and on explicit save. Show **Saving…**, **Saved**, or **Not saved — retry** based on server acknowledgement. Offline edits remain visibly unsaved; do not imply durable backup.
- **CRE-06:** Reordering works with move-up/down buttons; drag may be an enhancement. Concurrent edits use a version check and never silently overwrite newer work.
- **CRE-07:** Guest work stays in the active page until save/verification. Reloading may lose it; clearly prompt to save. Do not silently persist intimate drafts on shared devices.
- **CRE-08:** Changing theme preserves all contents. Going back never clears a completed envelope.

Draft allowances: at most 50 MB of processed media per draft and 150 MB across a creator's three active drafts. Temporary upload reservations share a separately enforced account cap of 50 MB, with bounded processing concurrency. Interrupted requests release reservations through a cleanup job. These limits also apply before payment.

### MED — Photos and voice

- **MED-01:** Use camera/library selection supported by the device. Permit JPEG, PNG, and WebP initially. Detect unsupported HEIC and show conversion guidance; HEIC support is P1 unless validated safely before launch.
- **MED-02:** Limit incoming image size to 10 MB and decoded dimensions to 20 megapixels. Resize to at most 1,600 pixels on the longest side, preserve orientation, strip metadata, and produce a sanitized derivative. Originals are temporary.
- **MED-03:** Request microphone access only after **Record voice**. Provide record/stop/play/delete/replace and visible time remaining. Let the creator add an optional written transcript without an external transcription service.
- **MED-04:** Choose a recording format supported by the current browser. Validate actual content, duration, and size on the server; test playback from iPhone to Android and the reverse. Accept only validated browser-produced audio formats, capped at 5 MB per clip.
- **MED-05:** Upload states are visible per attachment. Retrying must not duplicate files or count them twice. Sealing is blocked until every included asset is validated and ready.
- **MED-06:** If recording is interrupted by a call or navigation, offer any recoverable local recording for preview. Never label a partial recording as complete. Text and photo creation remain usable if microphone access fails.

### OPEN — Envelope availability

- **OPEN-01:** Every envelope is either available immediately or at a chosen date and time in an explicitly selected timezone. Default to 09:00 in that timezone; show a plain-language confirmation.
- **OPEN-02:** Store the resolved UTC time and original timezone. Reject nonexistent daylight-saving times and explicitly disambiguate repeated times. Never change the stored instant because the recipient travels.
- **OPEN-03:** “Open when sad” is an invitation, not a gate. No mood verification, daily limit, or emotional questionnaire.
- **OPEN-04:** Date-locked envelopes expose only their title and unlock time to the authorized recipient. Their text, thumbnails, media identifiers, transcripts, and file URLs must not reach the browser before unlock.
- **OPEN-05:** Use server time. Changing the phone clock, inspecting page source, requesting the API, or exporting cannot unlock an envelope early. Recheck when the user taps; a scheduler is not necessary to authorize reading.
- **OPEN-06:** Opened envelopes are reusable. Personal favourites and opened markers sync across the recipient's devices, but are not disclosed to the creator.

### SEND — Sealing and delivery

- **SEND-01:** Create an immutable version for checkout after validating the complete jar. Freeze editing while checkout is active; offer **Return to editing** after expiring the checkout safely.
- **SEND-02:** A successful purchase seals exactly the version previewed. If a late payment arrives for an older version, fulfil that paid version once and clearly distinguish any newer draft.
- **SEND-03:** Native share when supported, copy link everywhere, and explicitly requested email delivery. Share text is generic: “I made a little jar for you.” Do not include envelope content.
- **SEND-04:** Before claim, creator can correct the recipient email after reauthentication. Revoke outstanding invitations/challenges and issue a new invite generation atomically. If claim wins the race, address editing fails safely.
- **SEND-05:** After claim, recipient identity cannot be reassigned by the creator. Creator may stop sharing or request deletion, with the effects clearly described.
- **SEND-06:** Sent jars show Ready to share / Invitation emailed / Claimed / Sharing stopped / Hosting ended. Do not claim WhatsApp delivery based on opening a share sheet.

### KEEP — Reading, export, and ownership

- **KEEP-01:** Recipient can read and favourite, but cannot edit the author's content. Creator can view their own sealed copy, including future messages they authored.
- **KEEP-02:** Keepsake export contains an index, plain-text letters, sanitized photos, and audio files in a ZIP. Include timestamps and a simple manifest. An HTML viewer is P1; release one avoids active content in exports.
- **KEEP-03:** Recipient exports only currently unlocked content. Show how many scheduled envelopes are omitted and the final unlock date. Creator export may include all their authored content; label that difference.
- **KEEP-04:** Require recent authentication to export. Downloads expire after 15 minutes; export access is checked again at download and temporary archives are deleted within 24 hours. Revalidate availability while preparing and downloading.
- **KEEP-05:** Explain before download: “Anyone with these files can open them. Keep your copy somewhere private.” Saved files cannot be recalled by later revocation or deletion.
- **KEEP-06:** User can sign out this device, sign out all devices, and remove a received jar from their library. Removing a received jar revokes that recipient grant and hides it; the sealed invitation cannot silently re-add it. Creator's copy remains unless separately deleted.

## 8. Visual direction: a pocket stationery keepsake

The memorable object is a translucent illustrated jar filled with folded letters. Borrow from stationery, small gift shops, ribbon seals, and personal scrapbooks. Use contemporary spacing and controls with tactile paper details. Avoid a busy dashboard, constant hearts, excessive sparkles, and decorative glass panels around every form.

### Compact token system

| Token | Initial value | Use |
|---|---|---|
| Paper | `#FFF9FB` | Main background |
| Ink | `#29243B` | Body text and headings |
| Mulberry | `#773D69` | Primary buttons and selected controls |
| Petal | `#F4DDE8` | Envelope surfaces and decorative accents |
| Sky | `#DDECF7` | Second theme and calm backgrounds |
| Leaf | `#276653` | Saved/success text and icons |

These are design starting values; implementation must verify contrast for every actual pairing. Petal and Sky are surfaces, not text colours on white.

- Typography: **Fraunces** for short gift headings, **DM Sans** for controls and letters, with tested system/Unicode fallbacks. Self-host licensed font subsets. Body text starts at 17–18 px, line height approximately 1.6, and letter measure around 55–65 characters. Long text is left aligned; use correct direction for RTL content.
- Spacing: 4/8/12/16/24/32/48 px scale. Phones get at least 20 px side padding where practical. Buttons are visually distinct from envelope decorations.
- Shape: 12 px input corners, 16 px standard surfaces, irregular paper edges only on illustrative letters. One soft shadow at the active envelope, not identical shadows everywhere.
- Themes: **Petal**, **Blue Hour**, **Little Garden**. Each changes artwork and accents while preserving readable controls. No theme picker during the first letter.
- Illustration: lightweight SVG or optimized raster artwork with consistent lighting and paper textures. Do not require WebGL or a physics engine.
- Voice: optional stylized waveform, descriptive Play/Pause control, elapsed/total time, and transcript when supplied. No autoplay.

### Motion language

One signature interaction: tap envelope → lift → unfold → letter settles into reading position, approximately 450–650 ms. Replay is skippable; reopening a letter uses a quicker transition. Saving and navigation use 120–200 ms feedback. Reduced motion replaces unfolding with a short fade or immediate reveal. Content is available even if animation fails.

No endless floating particles, forced waits, sound on page load, or confetti over a personal letter. A short optional seal sound can play after an explicit user action if the user enabled sound.

### Layout sketches

Creator on a phone:

```text
Back                         Saved

Open when you miss me

[ Your letter                    ]
[                                ]

[ Add photo ]  [ Record voice ]

Available: Anytime        Change

[ Save envelope                  ]
```

Recipient after verification:

```text
My jars                      Menu

Anu, this is for you.
From Felix

        [ illustrated jar ]

All     Available now     Favourites

[ Open when you miss me           ]
[ Open when you need a laugh      ]
[ Open on your birthday   Oct 12  ]
```

The jar is a visual introduction; readable labelled buttons provide the actual navigation. Never make someone precisely tap tiny envelopes inside an illustration.

### Design review criteria

Five-second test: a new visitor can explain the gift. Ten-second recipient test: they can find an available envelope. The first screenshot should show a personal keepsake, not resemble a task tool. Validate this direction with a mobile concept and one animated prototype before producing the full interface. Design references should inform mood, not reproduce another product's artwork.

## 9. UX, accessibility, and writing

- Target WCAG 2.2 AA across core flows, with 44×44 CSS px interaction targets as our stronger default, visible focus, keyboard operation, meaningful labels, and no drag-only actions. AA's general minimum target-size rule is 24×24 with exceptions; 44×44 is a product choice. [W3C accessibility guidance](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- Support 320 px wide layouts, 200% text zoom, phone landscape, and small screens with the software keyboard open. Sticky buttons must not obscure focused fields.
- Screen readers receive envelope titles, locked/available state, save status, and recording state. Move focus into the reader and restore it to the triggering envelope on close.
- Use plain names and dates rather than abbreviations or technical errors. Code fields support paste and one-time-code autofill where available.
- Photos accept optional descriptions; voice messages offer an optional transcript. Label missing transcripts honestly rather than implying every personal recording is accessible.
- No fabricated testimonials, countdown scarcity, preselected marketing consent, hidden charges, or guilt-based upsells.

| Situation | Exact sample copy |
|---|---|
| Empty draft | “Start with one thing you'd like them to hear.” |
| New envelope | “A few words are enough.” |
| Autosave failed | “Your latest changes aren't saved. Keep this page open and try again.” |
| Microphone denied | “Microphone access is off. You can enable it in your browser or write a message instead.” |
| Scheduled envelope | “Opens 12 October at 9:00 AM · London time.” |
| Pending payment | “We're checking your payment. Your jar is safe. Please don't pay again yet.” |
| Verification | “Enter the code sent to the email you provided.” |
| Wrong recipient, after email verification | “This invitation isn't for this email. Try another email or ask the sender to check it.” |
| Hosting reminder | “Your jar's online access ends on [date]. Save a keepsake copy before then.” |
| Sharing stopped | “This jar is no longer available.” |

## 10. Security model

### Trust boundaries and explicit claims

Protect against forwarded links, guessed identifiers, another authenticated user reading a jar, malicious uploads, forged payments, replayed events, exposed tokens, premature scheduled reads, and leaked analytics.

The system uses HTTPS, provider encryption at rest, tightly scoped access, and private storage. **Release one does not claim end-to-end encryption.** The backend necessarily processes readable content for serving, file validation, backups, and date enforcement. Routine staff tools must not display letters; restricted infrastructure administrators may technically access data. Explain this accurately in the privacy notice.

Screenshots, recordings, and exports made by an authorized recipient cannot be prevented or remotely erased. Email access is the recovery boundary; a compromised mailbox can compromise account access.

OWASP recommends default-deny access and permission checks on every request, including static resources. The following concrete requirements apply that principle to this product. [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

### Access matrix

| Resource/action | Public/link holder | Creator | Claimed recipient | Routine support |
|---|---|---|---|---|
| Fictional sample | Read | Read | Read | Read |
| Generic invitation shell | Read | Read | Read | Status only |
| Draft content | Denied | Own only | Denied | Denied |
| Sealed content | Denied | Own authored copy | Granted jar; unlocked contents only | Denied |
| Future envelope body/media | Denied | Own only | Denied until due | Denied |
| Edit sealed contents | Denied | Denied | Denied | Denied |
| Change recipient | Denied | Before claim, reauthenticated | Denied | No manual reassignment |
| Keep favourites/opened markers | Denied | Only if also recipient | Own only | Denied |
| Revoke recipient access | Denied | Own jar | Remove own grant | Documented abuse action |
| Refund/transaction metadata | Denied | Own orders | Denied | Limited role, audited |

### SEC — Mandatory controls

- **SEC-01 Identity:** Managed email OTP for both roles, no homemade authentication. Initial limits: 60-second resend cooldown, five sends/hour per email, 20/hour per IP, and five verification attempts per challenge; tune behind shared-network usability tests. Expire codes within 10 minutes and invalidate after use. Generic unauthenticated responses must not enumerate accounts or intended recipients.
- **SEC-02 Invitation:** Use at least 128 bits of cryptographically random token entropy, store only a token hash, and bind it to a jar/invitation generation. Prefer a fragment token consumed by client-side POST and remove it from history after exchange. Never place private content in URLs. Email previews and crawlers must not claim or consume invitations on GET.
- **SEC-03 Claim:** Require both a valid invitation and the intended verified identity. Claim atomically once. Repeat claim by the same recipient is safe; another identity is denied. Claim cannot proceed while unpaid, expired, revoked, or deleting.

  Invitations expire 90 days after creation or at hosting expiry, whichever comes first. Before claim, the creator can regenerate an invitation without another purchase; this invalidates earlier tokens. Claimed recipients return through their authenticated library even after the invitation expires. Normalize emails consistently with the identity provider; do not invent Gmail-style dot or plus-address rules for arbitrary domains. The display name is self-supplied and must not be labelled as a verified identity.
- **SEC-04 Sessions:** Server-managed secure, HttpOnly, SameSite cookies; verify allowed origins/CSRF protections for mutations. Rotate sessions during authentication; 30-day inactivity and 90-day absolute expiry as initial policy. Require fresh verification within 10 minutes for export, recipient changes, account deletion, and revocation. All-device logout invalidates server grants.
- **SEC-05 Authorization:** Every content, metadata, export, media, and mutation path checks identity, ownership/grant, jar state, and unlock time as relevant. Row-level policies provide defence in depth. Privileged service credentials remain server-only; using them never bypasses application authorization.
- **SEC-06 Media delivery:** Private buckets; authenticated media endpoint rechecks the same permissions, including byte-range audio requests. Browser-facing private responses use no-store and avoid CDN/shared caching. Do not expose reusable storage signed URLs to recipients in release one. If internal signed URLs are required, keep them server-side and short-lived. Protect hosting expiry and revocation identically to content reads.
- **SEC-07 Revocation:** Stop new reads/exports within 60 seconds; invalidate sessions/grants as appropriate, remove private PWA/cache entries, and terminate access on refresh/navigation. Bytes already received, active buffered audio, and downloaded copies cannot be recalled.
- **SEC-08 Content:** Store letters as plain text, safely escape at render time, restrict links to safe protocols, and prohibit HTML/scripts. Validate schema, length, and ownership on the server for all inputs. Do not render user SVG, HTML, or uploaded executable content.
- **SEC-09 Upload isolation:** Issue scoped uploads only to the authenticated creator's draft. Reserve quota atomically and cap temporary bytes too. Quarantine uploads; verify type from bytes, enforce size/duration/dimension limits, scan and sanitize before marking ready, and use random filenames. Processing failures remain unavailable. No remote-URL import. This follows OWASP's layered upload validation approach. [OWASP file-upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- **SEC-10 Leakage:** No personal content in page metadata, social previews, image names, logs, analytics, error reports, email subjects, or notification previews. Private routes have noindex and no-referrer; these supplement authorization rather than replace it. No advertising scripts or session replay on private pages.
- **SEC-11 App hardening:** Enforce CSP, framing restrictions, transport security, secret scanning, dependency review, payload limits, and parameterized database access. Load payment scripts only when needed. Separate staging/test accounts, data, keys, and storage from production.
- **SEC-12 Operations:** Admin/provider accounts require MFA, least privilege, and audit trails. No “view any jar” support button. Exceptional access requires a documented purpose, narrowly scoped temporary privilege, and an auditable record. Test deletion and restoration paths for accidental content resurrection.

## 11. Payment and fulfilment

Dodo is the proposed provider. Implement hosted checkout for a one-time digital-product purchase; treat live merchant approval, acceptance of this product category, supported buyer locations, and final fees as launch dependencies. Follow the current [one-time integration guide](https://docs.dodopayments.com/developer-resources/integration-guide) and [webhook documentation](https://docs.dodopayments.com/developer-resources/webhooks).

- **PAY-01:** Price, product ID, currency, quantity, and jar version are server-owned. Never trust amounts sent by the browser. Snapshot the price and hosting terms on the order.
- **PAY-02:** Payment return pages cannot grant access. Verify webhook authenticity using the current official library, verify environment/order/currency/amount, then process the event idempotently.
- **PAY-03:** Store each provider event once. Out-of-order events cannot move a successful payment back to pending or re-enable a refunded/revoked entitlement.
- **PAY-04:** A unique order-to-entitlement relationship prevents duplicate sealed jars. Check existing paid/pending orders before creating another checkout. A second captured payment is flagged for resolution without charging or fulfilling again.
- **PAY-05:** Payment confirmed but sealing failed becomes **Preparing your gift**. Retry safely; reconcile unresolved orders periodically against the provider. Notify creator when ready without sending recipient invitations.
- **PAY-06:** Failed/cancelled checkout preserves the draft. Pending payments show a check-status route and avoid immediate duplicate payment prompts.
- **PAY-07:** Refunds and disputes are stored separately from fulfilment. Suspend new sharing/content access while a reversal is unresolved; restore only after a verified outcome. Confirmed full refund ends the hosted entitlement, subject to published terms. Downloaded copies remain outside service control.
- **PAY-08:** Make support, purchase receipt, hosting expiry, and refund request routes available from jar details. Publish a provider-compatible refund policy before live sales; do not assume “digital means non-refundable.”

## 12. State model and data requirements

Keep content, payment, and delivery states separate so “sent,” “paid,” and “claimed” cannot be confused.

| Object | States | Key rule |
|---|---|---|
| Jar | draft → frozen → sealed → hosting_ended; deleting → deleted | Sealed version is immutable; ending access is separate from erasing bytes |
| Order | created → pending → succeeded / failed / cancelled | Provider-verified success only; reversals tracked independently |
| Fulfilment | not_ready → preparing → fulfilled / needs_attention | Retry without duplicate entitlement |
| Invitation | ready → claimed; replaced / revoked / expired | Only intended identity can claim; link GET is inert |
| Recipient grant | active → revoked / removed / expired | Every private read checks current grant |
| Media | uploading → quarantined → processing → ready / rejected → deleted | Only ready assets can enter a sealed version |
| Export | queued → building → ready → expired / failed | Authorized unlocked content only; no permanent download URL |

Minimum entities:

- **Account:** managed identity ID, verified email, display name, locale, lifecycle timestamps. No required relationship or demographic profile.
- **Jar:** creator ID, recipient display name, cover note, theme, lifecycle, version, purchase time, hosting end date, accepted policy version.
- **Envelope:** jar/version ID, order, label, text, optional transcript, unlock UTC/timezone, associated media IDs.
- **Media:** owner/draft/version IDs, random object key, validated type, byte count, dimensions/duration, processing state, deletion status.
- **Invitation:** token hash, intended-email binding, generation, expiry, claim/revocation timestamps. Email updates invalidate its generation.
- **Grant:** jar and recipient identity, status, claimed time. Keep favourites/opened markers in recipient-owned records.
- **Order/event:** creator, jar version, product/price/currency snapshot, provider IDs, event deduplication key, verification/result, reversal status.
- **Export/deletion jobs:** requesting identity, scope, state, expiry, retry count, completion evidence.
- **Audit record:** actor ID, action, opaque resource ID, outcome, time; no letter text, email code, payment secret, or invitation token.

Database constraints enforce unique provider order/payment/event references, one paid entitlement per order, one claimed recipient per jar, and valid attachment ownership. Authorization never relies on UUID unpredictability alone.

## 13. Architecture and infrastructure

| Layer | Proposal | Responsibility |
|---|---|---|
| Web | Next.js + React + TypeScript | Public site, builder, authenticated reader, server endpoints |
| UI | Tailwind + CSS/SVG motion; small motion library only if useful | Responsive layout, illustration, accessible transitions |
| Identity/data | Supabase Auth + Postgres | OTP, scoped data, durable drafts, event ledger |
| Files | Supabase private Storage | Quarantine and sanitized media |
| Jobs | Durable database jobs + scheduled worker | Media validation, reconciliation, export, deletion, retention |
| Checkout | Dodo Payments | Payment collection and provider transaction events |
| Email | Resend or equivalent custom SMTP | Codes, explicit gift delivery, service notices |
| Hosting | Vercel production-appropriate plan | Web/server deployment and endpoint execution |
| Operations | Redacted error monitoring + restricted backup destination | Failure detection, recovery, media backup |

The initial $45/month Vercel/Supabase base discussed earlier excludes tax, usage, email growth, independent media backups, monitoring, and any processing worker. Size these after a measured prototype; do not imply a fixed bill regardless of traffic. Set monthly budget alerts before paid launch.

PWA caches only public artwork and the application shell. Private letters/media are fetched after authorization and not made available offline by default. A home-screen icon does not guarantee durable offline access; keepsake export is the explicit preservation mechanism.

## 14. Retention, backups, and deletion

| Data | Proposed retention |
|---|---|
| Unverified guest draft | Active page only |
| Abandoned upload/quarantine | Delete within 24 hours after abandonment/rejection |
| Inactive unpaid drafts | 30 days; email a seven-day warning where verified |
| Paid jar | Three years from payment, unless owner deletes or entitlement ends earlier |
| Hosted expiry grace | 30-day export-only grace; no new sharing; then active-content purge |
| Temporary export | At most 24 hours; download authorization expires sooner |
| Security logs | 30 days initially; redact sensitive fields |
| Operational backups | Rolling maximum 30 days, access restricted |
| Purchase/tax records | Minimum required legal/provider retention; separate from private content |

Warn creator and recipient 60, 30, and seven days before hosted expiry. Service reminders contain no personal letter contents. An unclaimed jar can still be exported by its creator.

Deleting a jar immediately blocks normal access, cancels invitations/exports, and queues media and content removal within seven days. Backup copies age out within 30 days. Keep a deletion ledger so recovery does not resurrect deleted content. Explain any separately retained transaction records.

Account deletion lists affected created jars before confirmation. Created jars and their grants are deleted; received jars are removed from that account without deleting the original creator's copies. A creator deleting their jar stops recipient online access. The confirmation states that downloaded keepsakes cannot be erased.

Back up both database and media. Supabase database backups include storage metadata but do **not** include the actual storage objects; a database restore alone cannot recover deleted photographs or recordings. [Supabase backup documentation](https://supabase.com/docs/guides/platform/backups)

Proposed recovery targets: up to 24 hours of data loss and restoration within one business day, as internal targets rather than a customer SLA. Run a complete database-plus-media restore rehearsal before launch and quarterly thereafter. Document outage steps and how to stop checkout during fulfilment failures. If the service closes, notify users and provide at least 60 days to export wherever operationally possible; do not accept new hosting commitments once closure is planned.

## 15. Performance, compatibility, and reliability

- Target mobile p75 LCP ≤2.5 s, INP ≤200 ms, and CLS ≤0.1 for the public and gift shell. These are design/verification targets, not current measurements.
- Core reading and navigation must work before optional illustration effects load. Lazy-load photos/audio after access checks and user navigation.
- Test on real iPhone Safari and Android Chrome, plus desktop Chrome, Edge, Safari, and Firefox current stable versions at release. Include WhatsApp embedded-browser entry and an **Open in browser** fallback.
- Cross-device audio playback, email verification while switching apps, expired sessions, low memory, network changes, and keyboards require device evidence.
- Draft writes and payment operations are retryable and idempotent. The interface reflects acknowledged state rather than optimistic “Saved” or “Paid.”
- Internal availability target: 99.5% monthly for opening existing jars. Alert on failed auth delivery, unavailable storage, failed reads, and fulfilment backlog. During an outage, preserve paid status and give a recoverable message.

## 16. Measurement without reading people's letters

Collect only essential, documented operational metrics. Do not collect envelope titles, names, moods, text, transcripts, photos, audio, recipient email, invitation tokens, or session replay. Disable third-party page analytics on gift routes.

For product evaluation, prefer voluntarily shared tester feedback and aggregate counters. Persist personal opened markers only to support the recipient's own library. Optional analytics consent must not be required to receive a gift.

| Measure | Initial validation target | Method |
|---|---|---|
| Understand the concept | 8/10 new testers explain it after five seconds | Moderated sample test |
| First envelope success | 8/10 complete it without help | Usability session |
| First-envelope time | Median under two minutes, excluding email delivery | Test observation |
| Recipient completion | 9/10 verified recipients open an envelope without help | Test observation |
| Purchase recovery | Every successful test charge yields one recoverable sealed jar | Payment scenario testing |
| Private content isolation | Zero unauthorized reads in the required security suite | Negative access tests |
| Paid fulfilment | ≥99% complete within 60 seconds of verified success in normal conditions | Content-free operational counters |

These are hypotheses and launch gates, not forecasts. After a small private pilot, review friction around writing, email claim, and willingness to pay before adding features.

## 17. Acceptance test catalogue

| ID | Scenario | Required result |
|---|---|---|
| A01 | New creator adds one text envelope | Can preview, purchase, and share without adding nine more |
| A02 | Creator switches theme or returns to a prior step | Content and attachments remain intact |
| A03 | Save fails or connection drops | Unsaved state is explicit; retry preserves content |
| A04 | Two tabs edit the same draft | Conflict shown; no silent overwriting |
| A05 | Mic denied / call interrupts recording | Recoverable state; text/photo path still works |
| A06 | Voice recorded on iPhone, opened on Android, and reverse | Play/pause/duration work without downloading another app |
| A07 | Oversized, forged-type, malicious, or decompression-bomb upload | Rejected before publication without exhausting worker resources |
| A08 | Simultaneous uploads exceed draft quota | Atomic limits hold; orphaned reservations/files cleaned up |
| A09 | Link forwarded to another person | Generic shell only; no names or message content; wrong identity cannot claim |
| A10 | Messaging crawler fetches invitation | Generic metadata; no claim or token consumption |
| A11 | Correct recipient claims twice or on another device | Same jar/library; no duplicate recipient grant |
| A12 | Claim races with recipient-email correction | One atomic outcome; obsolete email/token denied |
| A13 | User changes another jar/envelope/media ID in any API | Denied consistently, including direct storage access |
| A14 | Recipient inspects HTML, hydration data, network, export before unlock | No future body, photo, audio, transcript, or URL is exposed |
| A15 | Phone clock/timezone changed around scheduled date | Server-enforced instant unchanged; display remains understandable |
| A16 | DST ambiguous/nonexistent local time entered | Explicit disambiguation or validation; no silent date shift |
| A17 | Fake success redirect, wrong environment, forged webhook, or tampered price | No sealed entitlement |
| A18 | Duplicate/out-of-order webhook or double checkout submission | One correct entitlement; duplicates flagged/reconciled |
| A19 | Paid event arrives during outage or after returning to edit | Paid snapshot eventually fulfilled; creator never asked to pay again blindly |
| A20 | Refund/dispute event followed by older success event | Access does not incorrectly reactivate |
| A21 | Creator previews future letters | Allowed as author; does not mark recipient envelopes opened |
| A22 | Recipient exports with some letters locked | Only currently unlocked contents included; omissions clearly listed |
| A23 | Access revoked while exporting or reading media | New access denied within target; no claim of retracting received bytes |
| A24 | Logout then back button/PWA reopen on shared phone | Private content not served from persistent browser/app caches |
| A25 | Delete jar, then restore database/media backup | Deletion ledger reapplied; jar remains unavailable and purge resumes |
| A26 | Hosting expires | Normal sharing stops; export-only grace then active purge follows policy |
| A27 | Keyboard, screen reader, 200% text, reduced motion | Every core action remains usable; focus visible and restored |
| A28 | RTL/long Unicode content and long labels | No clipped controls; readable direction; layout remains stable |
| A29 | Payment succeeds but recipient email contains typo | Creator corrects before claim, no new payment required |
| A30 | Gift removed by recipient | Hidden/revoked in their library, creator copy intact, old link cannot silently re-add |

Automated tests cover permissions, time gates, payment transitions, quotas, and deletion. Browser tests cover primary journeys and recoverable errors. Physical-device checks establish microphone, media, installed-PWA, and embedded-browser behaviour. Automated results must not be described as device proof.

## 18. Delivery sequence and release gates

### Milestone 1 — Experience prototype

Create a mobile visual concept for landing, creator editor, recipient jar, and envelope reader using fictional data. Implement one clickable creation/reveal journey and the signature opening animation. Check five-second understanding and reading comfort. Exit: Felix can review the actual interaction and visual direction.

### Milestone 2 — Private working product

Implement managed auth, durable drafts, validated media, secure recipient claim, immutable versions, date enforcement, reading, favourites, export, and deletion. Use fictional/synthetic data for security testing. Exit: access matrix and time-gating tests pass; iPhone/Android voice exchange works.

### Milestone 3 — Purchase and operations

Integrate Dodo test checkout, signed events, reconciliation, email delivery, backups, retention, monitoring, and support operations. Verify approval and live terms with the provider. Exit: payment catalogue and full restore rehearsal pass; pricing and hosting terms are consistently displayed.

### Milestone 4 — Small paid launch

Run the complete creator/recipient journey on supported devices, resolve critical/high security findings, verify one authorized live purchase and refund, and publish required policies. Start with a limited audience and monitor fulfilment and support requests. Exit: paid gifts are consistently recoverable and recipients can open them without assistance.

Do not ship paid access while recipient authorization, media validation, payment reconciliation, exports, or backups are incomplete.

## 19. Risks and decisions to revisit

| Risk | Product response |
|---|---|
| People like the idea but never finish writing | Example prompts, one-envelope minimum, visible drafts, helpful optional cues |
| Recipient email adds friction | One-time claim, autofill/paste, remembered sessions, explicit sender guidance; test with real recipients |
| Link-only convenience conflicts with privacy | Keep verified claim as default; do not quietly downgrade on email failure |
| Low one-time price cannot fund unlimited service | Bound media/hosting; export; review real storage and support costs before price changes |
| Beautiful animations make older phones slow | Lightweight artwork, one signature interaction, reduced motion and static fallback |
| Seller approval or payout terms differ from assumptions | Provider approval and account-specific fee confirmation before live sales |
| Missing or leaked personal media harms trust | Private serving, independent backups, conservative logs, deletion/restore rehearsals |
| Founder support load exceeds available time | Self-service delivery correction, recoverable payments, documentation, and limited first launch |

Before checkout goes live, finalize the price, hosting term, refund terms, seller identity, product name/domain, and actual Dodo eligibility. Design and prototype work can proceed using the explicit proposals in this PRD without opening accounts or incurring paid commitments.

## 20. Definition of done

A creator can make a personal jar, save it reliably, preview it, pay once, and share it. The intended recipient verifies their identity, experiences a polished reveal, reads and hears available messages, and returns easily. Forwarded links, unauthorized accounts, client clock changes, and forged payments cannot unlock private content. Both roles can understand storage terms, recover from common failures, obtain permitted keepsake copies, and control deletion.

The release has documented automated and device evidence, measured accessibility/performance checks, a tested restoration procedure, provider approval, and no unresolved critical/high security issues in the reviewed scope. Remaining limitations are visible and honestly described.
