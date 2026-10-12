# Telegram Serverless integration

The Mini App and its Prisma/MariaDB database remain on Jino. Telegram Serverless
runs the bot's message and callback handlers. Next.js API routes cannot be
uploaded as a static Mini App build, so the frontend URL stays unchanged.

## Activate the prepared bot

1. BotFather → RPL30_bot → Serverless → CLI Access → Access token.
2. Add this value as the `TGCLOUD_TOKEN` production environment secret in GitHub.
   It is the `app<id>:<secret>` CLI token, **not** the Bot API token.
3. The bridge secret is derived automatically from the CLI token during both
   workflows and never printed. Optionally supply a separate
   `TELEGRAM_SERVERLESS_BRIDGE_SECRET` production secret to override it.
4. A configured `TGCLOUD_TOKEN` selects Serverless transport automatically.
5. Run the CI/CD Pipeline on main first to install the bridge secret on Jino.
6. Run “Deploy Telegram Serverless bot” on main. This fetches deployment state,
   pushes only our handlers and shared modules, and synchronizes the managed
   webhook without discarding queued updates. It does not migrate a database
   or change the Mini App URL.
7. In Telegram, send `/start`. Check the Play and My profile buttons, both
   notification settings buttons, then a friend request and room invitation
   between two accounts. Check `npx tgcloud webhook` for delivery errors.

No extra bot token is needed by Telegram-hosted handlers. The existing
`TELEGRAM_BOT_TOKEN` on Jino sends game notifications and result images.
The normal website deployment preserves any existing webhook by default.
Only an explicit `TELEGRAM_BOT_TRANSPORT=polling` permits replacing it.
Polling exits whenever any webhook is configured.

## Event notifications

Friend requests, accepted requests and room invitations insert an outbox event
in the same database transaction as the social action. Next.js `after()` tries
to deliver after the response; the server's minute worker retries up to five
times. A database lease prevents simultaneous workers from claiming the same
event. Delivery is at least once: a process crash after Telegram accepts a
message but before the database records it can still produce a duplicate.

Notifications respect the user's toggle and scheduled account deletion. The
recipient must have started the bot or granted permission to receive messages;
Telegram rejects delivery otherwise. Messages include Mini App links with a
stable profile ID or room code; these links do not bypass authentication.

## Deployment limits and fallback

The Serverless → Jino bridge synchronizes `/start` and notification preferences.
Welcome messages and Mini App buttons work even if Jino is temporarily
unreachable. A failed preference update is reported to the user; they can
change it directly in the Mini App profile. Bridge availability from Telegram's
runtime must be checked after activating CLI access.

Without `TGCLOUD_TOKEN`, no Serverless deployment can be performed. The existing
Jino polling path remains available where no webhook is configured. Polling now
synchronizes the user's bot-start status and handles notification callbacks.

Official documentation: https://core.telegram.org/bots/serverless
