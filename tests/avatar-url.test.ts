import { test } from "node:test";
import assert from "node:assert/strict";
import { publicAvatarUrl } from "../src/lib/avatarUrl.ts";
import { russianClubName } from "../src/lib/clubDisplayName.ts";
import { translateInterface } from "../src/lib/enTranslations.ts";
import { trophySections } from "../src/lib/trophySections.ts";

test("avatars only accept public HTTPS provider images", () => {
  for (const url of [
    "https://t.me/i/userpic/320/photo.jpg",
    "https://cdn4.telesco.pe/file/photo.jpg",
    "https://avatars.yandex.net/get-yapic/photo",
  ])
    assert.equal(publicAvatarUrl(url), url);
  for (const url of [
    "http://t.me/photo",
    "https://t.me.attacker.com/photo",
    "https://user:password@t.me/photo",
    "https://127.0.0.1/photo",
    "data:image/svg+xml,test",
    "https://t.me:444/photo",
  ])
    assert.equal(publicAvatarUrl(url), null);
});
test("public profile achievement sections have Russian sources and complete English labels", () => {
  assert.deepEqual(
    trophySections.map(([, label]) => label),
    [
      "Все",
      "Обычный драфт",
      "Один клуб",
      "Челленджи",
      "Мультиплеер",
      "Профиль",
    ],
  );
  for (const [, label] of trophySections)
    assert.doesNotMatch(translateInterface(label), /[А-Яа-яЁё]/);
  assert.equal(russianClubName("CSKA Moscow"), "ПФК ЦСКА");
  assert.equal(
    translateInterface(russianClubName("FC Krasnodar")),
    "Krasnodar",
  );
});

test('built-in fallback avatar stays stable per user and needs no remote image', async () => {
  const { avatarFallback } = await import('../src/lib/avatarFallback.ts');
  assert.deepEqual(avatarFallback('same-user'), avatarFallback('same-user'));
  for (const identity of ['', '361912433', 'Никита', '⚽']) {
    assert.match(avatarFallback(identity).primary, /^#[0-9a-f]{6}$/);
    assert.match(avatarFallback(identity).secondary, /^#[0-9a-f]{6}$/);
  }
});
