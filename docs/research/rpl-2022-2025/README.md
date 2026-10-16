# Supplied roster editions 2022–2025

The four user-supplied Markdown files are preserved as structured snapshots, with original filenames and SHA-256 checksums. Each edition contains 16 clubs: 393, 429, 426 and 432 cards respectively (1,680 total). Ratings and potential are retained, including potential below overall. Missing 2022 shirt numbers remain null.

Positions retain source tokens and map SW/LCB to centre back and RDM to defensive midfield. Repeated canonical roles are deduplicated. No positions are invented from general player profiles.

Player IDs reuse exact-name matches from the historical registry and 2019–2021 snapshots. Unmatched names receive stable name hashes; different spellings are not automatically merged. Club aliases are explicitly mapped.

Run `python3 scripts/build-user-rpl-2022-2025.py <source-directory>` to regenerate. The importer defaults to validation only; applying requires DATABASE_URL and a new private backup path. Existing differing seasons are rejected rather than overwritten.

The configured game range is 2006–2026. These supplied files do not contain a 2026 edition. The old backfill-2026-rpl-data.mjs is incomplete and is not run by this import. Counters and available years are derived from populated database records; this change does not fabricate a 2026 roster.
