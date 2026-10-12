# Bot, notification preferences and administration

## User experience

- `/start` sends the project logo, an English introduction and Play / My profile / Notifications buttons.
- Notification categories: project news (explicit opt-in), game invitations, season results, friend requests and request responses. A master switch preserves category choices.
- Bot choices persist in native Telegram Serverless SQLite immediately. Jino pulls changes and acknowledges only the exact revision saved. Profile writes update the same native preferences. Delivery checks current consent again; an unavailable preference service defers delivery.
- No Serverless handler fetches Jino: the previous connection consistently failed. Jino uses the authenticated Telegram management execution API, with fixed audited preference-service sources. The owner token remains in a private server environment and GitHub secrets.
- Profile avatars use Telegram pictures with a neutral initial fallback; cosmetic color and status controls were removed. Friends and achievement categories scroll in one row. Public achievements show four on small screens and six at `sm` and above, with expansion.
- Season completion creates a server-rendered PNG and queues the result even when the player leaves before the client animation finishes. The Mini App deep link opens the public season result. Client share images remain supported and are validated.

## Administration

- Campaign drafts support headings, plain text or restricted Telegram HTML, safe formatting controls, PNG/JPEG/WebP uploads, previews and an HTTPS action button. Uploaded images are decoded, resized and stripped of metadata.
- Manual, scheduled, daily, weekly, monthly, inactive-player, registration, season-completion and perfect-season triggers. Repeating schedules use 09:00 UTC; the interface displays selected dates in the administrator's local timezone. New campaigns are disabled by default.
- Campaign jobs freeze post content and paginate subscribers. Event keys and manual request IDs prevent duplicate queue entries. Delivery status distinguishes pending, sent, skipped, failed and cancelled. Failed campaign deliveries can be retried. Archive stops future triggers and cancels pending jobs/messages. Pause stops future automatic triggers.
- Only Project news subscribers with an established bot conversation receive campaigns. Game/social categories are independent of marketing consent. Messages to deleted or currently restricted accounts are skipped.
- Moderation supports preset or custom reasons, 1 hour / 1, 3, 7, 30 days / permanent duration, removal of restrictions and audit history. Owner/admin/moderator roles may moderate; viewers have read-only access. The project owner's Telegram account cannot be blocked.
- Restrictions are enforced server-side for authenticated mutations. Players can still change notification preferences. Restrictions expire automatically; progress is preserved.
- Activity ranking uses completed seasons, with rolling periods of 1, 3, 7, 30 and 365 days. New results use completion time; historical results without that field use their creation time. Ties use user ID, and the page displays up to 50 players.

## Delivery and deployment

Jino's existing Passenger timer is supplemented by a once-per-minute cron request to the authenticated worker endpoint. Outbox claims use a lease, five attempts and exponential backoff. Telegram does not provide a sendMessage idempotency key: a process crash after Telegram accepts a message but before the database confirmation can still duplicate delivery. The database queue itself is idempotent.

`TGCLOUD_TOKEN` is delivered only through the SSH deployment package into the existing `.env` (mode 600). It is never bundled into client code. The preference-service bridge secret is explicit or derived consistently from this token. The separate Bot API token remains necessary for Jino's outgoing photo/message delivery.

The Serverless deployment workflow fetches the current revision, deploys only project modules, applies safe schema migrations, verifies native storage without sending user messages and preserves pending webhook updates. The old reverse bridge is retained for compatibility but is no longer used by Serverless handlers.

## Validation

- 90 automated tests, including preference validation, marketing opt-in, automatic ban expiry, safe Telegram HTML, schedule timing and authenticated management API requests.
- TypeScript, ESLint, production build, deployment shell syntax and Prisma schema synchronization.
- Local production API checks: session and CSRF enforcement, preference persistence, restriction enforcement/history, image upload, HTML rejection, campaign request deduplication, opt-in audience selection, archive cancellation and completion-based ranking.
- No real campaigns or moderation actions were performed during verification; API checks used isolated SQLite fixtures and disabled Telegram credentials.
