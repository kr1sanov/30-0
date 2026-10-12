import test from "node:test";
import assert from "node:assert/strict";
test("reverse preference synchronization uses authenticated management API without exposing credentials", async () => {
  const before = process.env.TGCLOUD_TOKEN;
  const oldFetch = globalThis.fetch;
  process.env.TGCLOUD_TOKEN = "app8197702906:fake_test_token";
  globalThis.fetch = (async (input, init) => {
    assert.equal(
      String(input),
      "https://cloud.telegram.org/app8197702906/manage/run",
    );
    assert.equal(
      (init?.headers as Record<string, string>).Authorization,
      "Bearer app8197702906:fake_test_token",
    );
    const body = JSON.parse(String(init?.body));
    assert.equal(body.module, "endpoints/preferenceService");
    assert.equal(body.args.action, "health");
    assert.ok(body.sources.schema);
    return Response.json({
      ok: true,
      result: { result: { ok: true, count: 0 }, log: [], time: 1 },
    });
  }) as typeof fetch;
  try {
    const path = "../scripts/telegram-cloud-client.mjs";
    const mod = await import(path);
    assert.deepEqual(await mod.callCloudPreferences("health"), {
      ok: true,
      count: 0,
    });
    globalThis.fetch = (async () =>
      Response.json(
        { ok: false, description: process.env.TGCLOUD_TOKEN },
        { status: 401 },
      )) as typeof fetch;
    await assert.rejects(
      mod.callCloudPreferences("health"),
      /service unavailable/,
    );
  } finally {
    globalThis.fetch = oldFetch;
    if (before === undefined) delete process.env.TGCLOUD_TOKEN;
    else process.env.TGCLOUD_TOKEN = before;
  }
});

test("private runtime configuration takes precedence over a Passenger process started before secret rotation", async () => {
  const path = "../scripts/telegram-cloud-client.mjs";
  const { selectCloudConfig } = await import(path);
  assert.deepEqual(
    selectCloudConfig(
      {
        TGCLOUD_TOKEN: "app8197702906:fresh",
        TELEGRAM_SERVERLESS_BRIDGE_SECRET: "fresh-bridge",
      },
      {
        TGCLOUD_TOKEN: "app8197702906:stale",
        TELEGRAM_SERVERLESS_BRIDGE_SECRET: "old-bridge",
      },
    ),
    {
      token: "app8197702906:fresh",
      bridge: "fresh-bridge",
      clientId: "8197702906",
    },
  );
});
