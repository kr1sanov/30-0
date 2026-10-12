import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  validPreferencePatch,
  preferenceData,
  preferencesFromUser,
  notificationAllowed,
} from "../src/lib/notificationPreferences.ts";
import { activeRestriction } from "../src/lib/moderation.ts";
import {
  validTelegramHtml,
  campaignPeriod,
} from "../src/lib/campaignContent.ts";

test("news requires opt-in and global pause preserves categories", () => {
  assert.equal(DEFAULT_NOTIFICATION_PREFERENCES.news, false);
  assert.equal(
    notificationAllowed(
      { ...DEFAULT_NOTIFICATION_PREFERENCES, enabled: false },
      "results",
    ),
    false,
  );
  const prefs = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    news: true,
    results: false,
  };
  assert.deepEqual(preferencesFromUser(preferenceData(prefs)), prefs);
});
test("preference patches reject unknown keys, prototype keys and non-booleans", () => {
  for (const value of [
    null,
    [],
    {},
    { news: "true" },
    { unknown: true },
    JSON.parse('{"__proto__":true}'),
  ])
    assert.equal(validPreferencePatch(value), false);
  assert.equal(validPreferencePatch({ news: true, results: false }), true);
});
test("restrictions expire automatically and permanent bans remain active", () => {
  const now = new Date("2026-10-12T10:00:00Z");
  assert.equal(
    activeRestriction(
      { bannedAt: now, bannedUntil: now, banReason: "spam" },
      now,
    ),
    null,
  );
  assert.deepEqual(
    activeRestriction(
      { bannedAt: now, bannedUntil: null, banReason: "spam" },
      now,
    ),
    { reason: "spam", until: null },
  );
  assert.equal(activeRestriction({ bannedAt: null }, now), null);
});
test("Telegram HTML accepts balanced safe formatting and rejects injection", () => {
  assert.equal(
    validTelegramHtml(
      '<b>Hello</b> <a href="https://t.me/RPL30_bot">Play</a> &amp; enjoy',
    ),
    true,
  );
  for (const html of [
    "<b>open",
    "<b><i>x</b></i>",
    "<img src=x onerror=alert(1)>",
    '<a href="javascript:alert(1)">x</a>',
    '<b onclick="x">x</b>',
    "<a>x</a>",
    "a & b",
    '<a href="https://x" style="x">x</a>',
  ])
    assert.equal(validTelegramHtml(html), false, html);
});
test("scheduled and repeating campaigns stay due after the initial three-minute window", () => {
  const monday = new Date("2026-10-12T12:00:00Z");
  assert.equal(campaignPeriod("daily", monday, null), "2026-10-12");
  assert.equal(campaignPeriod("weekly", monday, null), "2026-10-12");
  assert.equal(
    campaignPeriod("weekly", new Date("2026-10-13T12:00:00Z"), null),
    null,
  );
  assert.equal(campaignPeriod("monthly", monday, null), null);
  assert.equal(
    campaignPeriod("scheduled", monday, new Date("2026-10-11")),
    "scheduled",
  );
  assert.equal(campaignPeriod("manual", monday, null), null);
});
