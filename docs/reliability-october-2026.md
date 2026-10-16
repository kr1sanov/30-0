# October 2026 reliability changes

Historical player imports used the complete canonical name in `lastName`. Display normalization now detects that case, with compound football nicknames preserved. Club display aliases use complete Russian names while retaining old aliases and English names; roster IDs and imported snapshots stay unchanged.

One Club defaults to more than eight distinct roster seasons and a playable squad. Admin can view every club and explicitly open a shorter history or hide any club. Hidden clubs are checked again when a run is created.

Lobby readiness is conditional on presence. Visible clients poll every 2.5 seconds; readiness expires after 12 seconds without a heartbeat. `pagehide`, hidden-tab changes and leaving the room clear readiness and countdown through an authenticated endpoint. Starting a draft requires a visible heartbeat from every human after the countdown deadline, and includes a database predicate for every participant's readiness and presence. Clients retry while awaiting these confirmations. Draft timers retain their existing behavior after play starts.

A series continues in its original room. Advancing archives the round's result, squads and run references before resetting seats. Settings, participants, member keys and series scores remain fixed. Runs retain durable room/round markers after seats advance. History groups current and legacy room chains; round squads remain expandable.

## Telegram delivery

Jino cannot access the Telegram cloud preference endpoint. The GitHub notification workflow now synchronizes cloud preferences and performs delivery outside Jino. Application preference changes are durable partial patches; cloud updates preserve unacknowledged application patches. Recipient settings and bot language are rechecked before delivery, including already-acknowledged cloud revisions. Never-started chats are kept pending. Closed invitations and resolved friend requests are skipped.

Queue items use timed leases and attempt-specific acknowledgements. Retries use backoff. A worker failure cannot silently mark a message sent. The workflow runs every five minutes; GitHub scheduling can introduce additional delay. No bot credentials enter logs.

## Season analytics

Every new single-player result stores its full simulation JSON and player contributions. Team goals are allocated among actual outfield players, with separate assists, using a stable seed. Contribution totals match team GF exactly; assists cannot exceed goals. Multiplayer shares contribution data for all room participants. These are simulation statistics, not real-world season statistics. Team filters and separate scorers/assisters are available in all playable modes. Human table rows carry participant identity, self labeling and distinct colors.

## Scheduled challenges

Release: **17 October 2026, 12:00 Moscow / 09:00 UTC**. Until release, public listing and creation are blocked. Admin can override all issues with Scheduled/Open/Hidden, including old issues.

- CSKA blitz: prime Oblyakov and Borisko; first five matches at least 11 goals, at most 2 conceded, at least 3 clean sheets. A league title is not required.
- Akron goalkeeper: special challenge-only Terekhovskiy prime card, game rating 90; 30 matches, at most 15 conceded and at least 15 clean sheets. The special rating is an editorial game value, not an EA/FC rating or an imported historical card. It does not modify roster editions.

Sources: [CSKA result](https://pfc-cska.com/ru/novosti/vse-novosti/32659-pfk-cska-rostov-40/), [CSKA record](https://pfc-cska.com/ru/novosti/vse-novosti/32662-pfk-cska-ustanovil-rekord-kubka-rossii-zabiv-tri-bezotvetnih-myacha-za-11-minut/), [Akron report](https://fcakron.ru/news/2517), [Terekhovskiy profile](https://fcakron.ru/player/670).

## Validation

Unit tests cover old name imports, season thresholds, contribution totals, and exact challenge release/objective boundaries. The isolated integration suite checks admin overrides, stale/left readiness, rejected starts, same-room continuation, archived rounds, grouped history, hidden challenge creation, both CSKA starters, simulation persistence, notification leases, acknowledgements and opt-outs. It runs against local SQLite and never sends Telegram messages. CI gates deployment on both the MySQL build and the isolated flow checks.
