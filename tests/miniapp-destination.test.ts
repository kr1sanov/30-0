import test from "node:test";
import assert from "node:assert/strict";
import { consumeMiniAppDestination } from "../src/lib/miniAppDestination.ts";
function memory() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
test("a result opens once and returning home ignores the retained Telegram parameter", () => {
  const storage = memory();
  assert.equal(consumeMiniAppDestination("result", "season_a", storage), true);
  assert.equal(consumeMiniAppDestination("result", "season_a", storage), false);
  assert.equal(consumeMiniAppDestination("result", "season_b", storage), true);
});
test("a fresh explicit link reopens a result and profile consumption is independent", () => {
  const storage = memory();
  consumeMiniAppDestination("result", "same", storage);
  assert.equal(
    consumeMiniAppDestination("result", "same", storage, true),
    true,
  );
  assert.equal(consumeMiniAppDestination("profile", "same", storage), true);
  assert.equal(consumeMiniAppDestination("profile", "same", storage), false);
});
