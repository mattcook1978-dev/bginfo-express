# BGInfo Express — Going Live Plan

## Overview

Turn BGInfo Express into a paid, multi-device SaaS product for dyslexia assessors.
Assessors pay a monthly or yearly subscription to manage up to 20 learner records,
accessible from any device. All learner data is encrypted client-side — the server
stores encrypted blobs it cannot read.

---

## Key Decisions

### Privacy model: "Blind server" with encrypted recovery keys
- Assessor data is encrypted in the browser before being uploaded
- The server stores encrypted blobs and cannot read learner data
- Each assessor has a recovery key, stored on the server encrypted with a master key (AWS KMS)
- If an assessor loses their recovery key, we can retrieve it after identity verification
- Every recovery key access is logged (who asked, when, why)
- This is documented clearly in the privacy policy — assessors consent at sign-up

### Storage: Cloudflare R2
- Encrypted blobs stored in Cloudflare R2 (extremely cheap, global CDN)
- Free up to 10GB, then pennies — JSON blobs are tiny

### Auth: Supabase Auth
- Email and password login with email verification
- EU-hosted (GDPR compliant)
- Free up to 50,000 monthly active users
- Handles password reset emails automatically

### Payments: Stripe
- Monthly and yearly subscription options
- Hard cap at 20 learner records (enforceable server-side)
- Top-up option (e.g. add 10 more learners) to be added later — Stripe supports this easily
- Subscription lapse: block new records, don't delete existing ones

### Transactional email: Resend
- Account verification, password reset, receipts, renewal reminders

---

## The Plan

### Phase 1 — Account system
- Set up Supabase Auth (email/password login, email verification)
- Build login, register, and account pages in the app
- Implement two-locked-boxes encryption model:
  - Random encryption key generated on first login
  - Locked with assessor's password
  - Locked with a recovery key
- Set up AWS KMS to hold the master key
- Store assessor recovery keys on server, encrypted with AWS master key
- Show recovery key to assessor on first login with clear instructions
- Log all recovery key access events

### Phase 2 — Cloud sync
- Encrypt assessor data and upload to Cloudflare R2 on every save
- Download and decrypt on login from any device
- Conflict resolution: last save wins (timestamp-based)

### Phase 3 — Payments
- Set up Stripe account linked to business bank account
- Build subscription page in app (monthly and yearly options)
- Connect Stripe to app to gate access based on active subscription
- Enforce 20 learner limit server-side
- Handle lapsed subscriptions: block new records, prompt renewal

### Phase 4 — Legal and admin
- Register with the ICO (£40–60, done online)
- Sign Data Processing Agreements with: Supabase, Stripe, Netlify, Cloudflare, AWS
- Solicitor to draft or review:
  - Privacy policy (must cover encrypted recovery key storage and access policy)
  - Terms of service (data loss disclaimer, subscription terms, learner cap)
- Write internal policy for handling recovery key requests (identity verification process, logging)
- Set up Resend for transactional emails

### Phase 5 — Testing and launch prep
- Set up a separate test environment
- Test every scenario: signup, password reset, recovery key request, subscription lapse, hitting the 20 learner cap, cancellation
- Beta test with a small group of assessors (free or discounted in exchange for feedback)
- Fix issues before public launch

### Phase 6 — Go live
- Open to paying customers
- Monitor closely in first few weeks
- Support process ready for: login issues, recovery key requests, billing questions

---

## Future additions (post-launch)
- Top-up option: add more learner slots beyond 20 (Stripe usage-based billing or additional tiers)
- Multi-assessor / team accounts

---

## Notes
- Phases 1 and 2 are the heaviest build — do together
- Phase 3 can be built in parallel once Phase 1 is stable
- Phase 4 (legal) should start early — don't wait until build is done
- Do not launch without Phase 4 complete
