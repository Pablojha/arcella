# Compliance checklist

What Arcella does today for each legal and compliance area, and what its owner still has to do. **This is not legal advice.** It is an engineering status list to take to a lawyer (and to a chartered accountant for tax) before Arcella grows. Last reviewed 3 November 2026.

Arcella is a free network for architecture students and professionals in India. It takes no payments, shows no ads and runs no analytics or tracking.

## At a glance

| Area | In the product | Owner to-do |
| --- | --- | --- |
| Terms and Privacy Policy | Done: `/terms`, `/privacy`, `/cookies`, `/refunds`, with consent recorded at sign-up | Fill in the business details; have a lawyer review |
| Data protection | Export, correction, deletion, retention limits, essential-only storage | Decide the minimum age; sign provider DPAs; write a breach plan |
| Liability and disclaimers | Disclaimers, limitation of liability and indemnity in the Terms | Decide the liability cap with a lawyer |
| Intellectual property | Licence terms, copyright policy, "Copyright or IP" report reason | Trademark search and filing; licence for the code |
| Payments (PCI DSS) | Not applicable: no payments | Follow the plan below before charging anything |
| User content and takedowns | Community Guidelines, reporting, admin review, blocking, group moderators | Name a Grievance Officer and staff the inbox; decide on 180-day retention |
| Accessibility | WCAG 2.2 AA automated checks on every page; statement at `/accessibility` | Manual screen reader audit; alt text and captions |
| Employment and contractors | Not applicable in code | Written agreements with IP assignment before anyone else contributes |
| Business structure and tax | Not applicable in code | Choose a structure; register for tax when required |

## Business details still missing

The legal pages show these as clearly marked placeholders until they are filled in `frontend/src/config/site.js` (and `VITE_CONTACT_EMAIL` on Vercel):

- `operator`: the legal name of the person or company that runs Arcella
- `contactEmail`: a public inbox for privacy, legal and support requests
- `address`: a postal address, or at least city and state, for legal notices
- `governingLaw`: the law and courts for the Terms, for example "the laws of India; courts of [city], [state]"
- `grievanceOfficer`: the Grievance Officer's name
- `liabilityCap`: any cap on Arcella's liability, decided with legal advice

## 1. Terms of Service and Privacy Policy

**In place**
- Terms of Use (`/terms`), Privacy Policy (`/privacy`), Cookie Policy (`/cookies`), Refund Policy (`/refunds`), Community Guidelines (`/guidelines`), Copyright Policy (`/copyright`) and Accessibility Statement (`/accessibility`). All are linked from the footer of every public page and from Settings.
- Sign-up requires ticking "I agree", and the API refuses sign-ups without it (`acceptTerms` in `backend/src/routes/auth.routes.js`). The time of agreement is stored as `termsAcceptedAt` on the user.
- The Privacy Policy describes exactly what the code collects, who can see it, which providers handle it, where it is stored and how long it is kept.

**Owner to-do**
- Fill in the business details above, then have a lawyer review all seven pages.
- When a policy changes materially, update `policiesUpdated` in `site.js` and tell members. There is no "please accept the new terms" prompt yet. Add one if a lawyer says the change needs fresh consent.

## 2. Data protection (India DPDP Act 2023, EU/UK GDPR, California CCPA/CPRA)

**In place**
- **Access and portability:** Settings → Your data downloads a JSON file of the member's account, content, messages, connections, notifications, settings, verification requests and reports (`GET /api/users/me/export`, limited to 5 an hour). It leaves out password hashes and push keys. Lists of other people (likes, viewers, followers) appear as counts only.
- **Correction:** members edit their profile at any time.
- **Erasure:** Settings → Delete account removes the profile, everything the member created, and the messages they sent or received (`deleteAccount` in `backend/src/services/account.js`).
- **Retention limits:** stories expire after 24 hours, notifications after 60 days and one-time codes after 10 minutes. Verification documents are deleted once reviewed. Push addresses are removed on logout, on a password change, or when a push service rejects them.
- **Minimal storage on devices:** only essential browser storage by default. Preferences are kept across visits only with consent (Cookie settings).
- **No selling, sharing for ads, analytics or tracking.**
- **Security:** HTTPS with HSTS, Argon2id password hashing, a pinned JWT algorithm, server-side permission checks, rate limits, a strict Content Security Policy, and encrypted push payloads (see `SECURITY.md`).

**Decisions and gaps for the owner**
- **Minimum age.** The Terms say 16. India's DPDP Act treats everyone under 18 as a child: processing their data needs verifiable consent from a parent, and they must not be tracked or targeted with ads. Either raise the minimum age to 18 or add a parental-consent flow before accepting 16 and 17 year olds. Some first-year B.Arch students are 17. Decide with a lawyer.
- **When the rules apply.** The DPDP Rules 2025 bring most duties into force in phases through 2027. Confirm the exact dates with a lawyer.
- **Providers (processors).** MongoDB Atlas (database, Singapore), Render (API, Singapore), Vercel (website), Cloudinary (uploads), the email provider (once SMTP is set up) and GIPHY (if a key is added). Accept or sign each one's data processing agreement and keep copies.
- **Data outside India.** The database and server are in Singapore. The DPDP Act allows this unless the government restricts that country. Re-check if a restriction list is published.
- **Breach plan.** Write down who decides, who tells members, and how to reach the authorities. Under the DPDP Rules, a breach is reported to the Data Protection Board and to affected people without delay, with a detailed report within 72 hours. GDPR also has a 72-hour deadline. CERT-In's 2022 directions require reporting certain cyber incidents within 6 hours.
- **Logs.** The CERT-In directions also expect system logs to be kept for 180 days. The API keeps no request logs of its own today, and the host keeps only a short history. Decide with a lawyer whether a log store is needed. If one is added, add it to the Privacy Policy as a provider.
- **GDPR and CCPA reach.** Arcella targets India, so GDPR likely applies only if it is offered to people in the EU or UK. CCPA applies only above its revenue or data-volume thresholds. The Privacy Policy already describes both sets of rights. Revisit this if the audience changes.

## 3. Liability and disclaimers

**In place:** the Terms include "as is" disclaimers (no guarantee of jobs, mentoring or listings), a limitation of liability, an indemnity for members' own content, and a clause on links to other sites.

**Owner to-do:** decide the liability cap (`liabilityCap`) and check the wording with a lawyer. Indian consumer law limits how far liability can be excluded, especially if paid features are added.

## 4. Intellectual property

**In place**
- Members keep ownership of what they post and give Arcella a licence to show it on the service (Terms → Your content).
- The Terms cover Arcella's own name, logo and code, and ask members to respect others' work.
- The Copyright Policy (`/copyright`) explains how to send a notice, what happens next, and how to send a counter-notice.
- "Copyright or IP" is a report reason (`REPORT_REASONS` in `backend/src/config/constants.js`).

**Owner to-do**
- Search and register the "Arcella" name and logo as trademarks (IP India). Classes commonly considered for a social network are 9, 38, 42 and 45; a trademark attorney can confirm.
- Choose a licence for the code. The repository has no `LICENSE` file, so by default all rights are reserved.
- Check that third-party assets (fonts, icons, images) are used within their licences. The npm dependencies have not had a licence audit yet.
- Takedown timelines differ by law. India's Copyright Rules 2013 (rule 75) expect access to be disabled for 21 days while the complainant gets a court order. The US DMCA has its own notice and counter-notice rules. Have a lawyer align `/copyright` with the laws you rely on.

## 5. Payment processing (PCI DSS)

**Today:** not applicable. Arcella takes no payments and never asks for card or bank details. The Refund Policy says so.

**Before charging for anything**
- Use a payment gateway with a hosted checkout or payment page, so card data never touches Arcella's servers. This keeps PCI DSS scope to the smallest self-assessment (SAQ A). Ask the provider for its PCI DSS attestation.
- Never store card numbers. RBI rules have barred merchants from storing card data since October 2022. Recurring payments need e-mandates.
- Rewrite the Refund Policy with real terms, show the operator's details, and follow India's Consumer Protection (E-Commerce) Rules 2020.
- Register for GST when required, and issue invoices.

## 6. User content, moderation and takedowns

**In place**
- Community Guidelines (`/guidelines`) set out what is allowed, how reporting works, what happens when rules are broken, and how to appeal.
- Members can report posts, comments, projects, profiles, group chat messages and more, with reasons: spam, harassment, inappropriate, fake, copyright or other. Admins review reports in Admin → Reports and can remove the content.
- Members can block anyone. Blocked people cannot see their profile or posts, or contact them.
- College admins and co-admins can delete messages in their college's group chat.
- The Terms name a Grievance Officer (placeholder) and promise acknowledgement within 24 hours and resolution within 15 days, as India's IT Rules 2021 require.

**Decisions and gaps for the owner**
- **Grievance Officer.** Name one, publish their name, and make sure someone reads the inbox daily. The 24-hour and 15-day promises are only as good as the staffing behind them.
- **Fast removals.** The IT Rules require removal within 24 hours of complaints about intimate images or impersonation, and within 36 hours of a court or government order. Today removal is manual through Admin → Reports.
- **180-day retention.** The IT Rules ask intermediaries to keep information about removed content, and a user's registration details after they delete their account, for 180 days. Arcella deletes immediately, which matches its Privacy Policy. Changing this needs a decision with a lawyer and an update to the Privacy Policy. No code change has been made.

## 7. Accessibility (WCAG 2.2, ADA, EN 301 549)

**In place**
- Every public and members' page is scanned with axe-core against WCAG 2.2 A and AA, in light and dark mode, on phone and desktop. This runs in CI on every push, and all pages pass.
- Keyboard access with a visible focus outline, accessible names, AA contrast, underlined links in text, reduced-motion support, and reflow from 320 px with no sideways scrolling.
- An Accessibility Statement (`/accessibility`) with known gaps and how to report problems.

**Known gaps:** member photos have no written descriptions (alt text), videos and voice notes have no captions or transcripts, and GIFs have no descriptions.

**Notes:** automated tools catch only part of WCAG, so no conformance claim is made. A manual audit with NVDA, VoiceOver and TalkBack is the next step. The ADA has no specific technical standard for private websites; courts and the US DOJ refer to WCAG 2.1 AA. EN 301 549 uses WCAG 2.1 AA for web content. The European Accessibility Act exempts microenterprises providing services and covers mainly e-commerce and similar services, so it likely does not apply today. India's Rights of Persons with Disabilities Act 2016 also expects accessible services.

## 8. Employment and contractor agreements

Not something code can provide. Before anyone else writes code, designs, moderates or handles data for Arcella:
- Use written agreements. Under India's Copyright Act, an assignment of copyright must be in writing, so include an IP assignment clause.
- Add confidentiality terms, and limit access to production data and admin rights to people who need them.
- Treat volunteer moderators (college admins) under the Terms and Community Guidelines, and remove their roles when they leave.
- If the repository accepts outside contributions, choose a code licence and a contributor agreement first.

## 9. Business structure and tax

Not something code can provide. Talk to a chartered accountant or company secretary about:
- **Structure:** a sole proprietorship, an LLP or a private limited company. A company or LLP separates personal and business liability and makes investment and contracts easier.
- **Registrations:** PAN and a bank account in the business's name; GST once turnover passes the threshold or when selling to other states requires it; optional Startup India (DPIIT) recognition.
- **Ownership:** if Arcella was built while studying, check whether your institution's intellectual property policy says anything about it.
- **Accounts:** Arcella's hosting, domain and email accounts should be owned by the business, not a personal account, once one exists.
