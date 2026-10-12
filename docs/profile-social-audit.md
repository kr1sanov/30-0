# Profile, social flow and Mini App review — 12 October 2026

## Current live inspection

1. Home: accessible, game modes and navigation visible.
2. Profile entry: Telegram sign-in is required in the inspection browser.
   The authenticated profile could not be visually audited in that session.
3. Footer: the live version still displayed “Telegram Mini App”; the change
   renames it to “Telegram”.

## Implemented fixes

- Friends have separate Friends, Incoming, Sent and Search views. Username
  search is authenticated, rate limited, limited to twenty results and cancels
  stale queries. Requests can be accepted, declined and cancelled in place.
- Invitations appear before achievements. Long friend lists initially show
  three people. Buttons have 44px touch targets and responsive wrapping.
- The redundant public-profile button is removed. Profile sharing uses Telegram
  inside the Mini App and native sharing with clipboard fallback in browsers.
- Profile deep links accept stable IDs, including users without usernames.
- Avatar settings use an accessible dialog with focus management and Escape.
- Social data fetching no longer queries unused multiplayer/referral suggestions.
  The profile subscribes only to profile stats and runs its clock only when an
  account deletion is pending.
- Missing English navigation, profile, challenge and admin copy is added.
  DOM localization processes changed subtrees instead of repeatedly scanning
  the complete document; its own mutations do not trigger another pass.
- Social event delivery uses a transactional outbox and retry worker.
- Telegram HTTP success no longer counts as delivery when the API payload
  reports failure. Website deploys preserve platform-managed webhooks.

## Verification limits

Automated API checks cover friends, search, requests, cancellation, invitations,
notification queueing and bridge authentication against a disposable database.
Unit tests cover Bot API rejection, preserving Serverless webhooks and English
copy. ESLint, TypeScript and production build are checked separately.

Real iOS/Android Telegram sessions, authenticated visual layouts and actual
Telegram delivery still require checking on the deployed version. Serverless
runtime execution requires the user's separate CLI access token. This review
is not a claim that every project flow or device has been audited.

## Dependency follow-up

The installation audit reported one critical and ten high dependency findings.
Next.js is updated to 16.3.8, Sharp to 0.35.5 and source-map-js to 1.2.2.
Prisma's config dependency is constrained to deepmerge-ts 8.0.0; client
regeneration and database sync pass with that version. The final
`npm audit --omit=dev` reports zero findings. Development-only glob tooling
still has upstream advisory warnings; this is not a claim that the complete
build dependency tree has zero findings.

The Serverless workflow retries webhook synchronization and probes the Jino
bridge from Telegram using an invalid user ID. A 400 response proves the
bridge accepted its secret and reached validation without modifying user data.
The diagnostic endpoint is used only by `tgcloud run`, never deployed.
