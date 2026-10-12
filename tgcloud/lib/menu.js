import { api } from "sdk";
import { defaults, normalize, ensurePreferences } from "./preferences.js";
export async function mainMenu() {
  const me = await api.getMe();
  const base = `https://t.me/${me.username}?startapp`;
  return {
    inline_keyboard: [
      [
        { text: "⚽ Play", url: base },
        { text: "My profile", url: base + "=my_profile" },
      ],
      [{ text: "🔔 Notifications", callback_data: "preferences" }],
    ],
  };
}
export async function preferenceMenu(tgId) {
  const row = await ensurePreferences(tgId);
  const p = normalize(row.prefsJson);
  const labels = {
    enabled: "Allow notifications",
    news: "Project news",
    invitations: "Game invitations",
    results: "Game results",
    friends: "Friend requests",
    friend_updates: "Request updates",
  };
  return {
    inline_keyboard: [
      ...Object.keys(defaults).map((key) => [
        {
          text: `${p[key] ? "✅" : "⬜"} ${labels[key]}`,
          callback_data: "pref:" + key,
        },
      ]),
      [{ text: "Back to 30-0", callback_data: "menu" }],
    ],
  };
}
export const preferenceText =
  "🔔 Notification settings\n\nChoose which messages you receive. Turning off all notifications preserves your category choices. These settings also apply in your Mini App profile. Project news is optional.";
