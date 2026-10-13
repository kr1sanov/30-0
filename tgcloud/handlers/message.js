import { api } from "sdk";
import { changePreferences, ensurePreferences } from "../lib/preferences.js";
import { languageFor, languageMenu, notificationLanguageMenu, sendWelcome, preferenceMenu, preferenceText } from "../lib/menu.js";
export default async function handleMessage(message) {
  if (message.chat?.type !== "private" || !message.from) return;
  const command = String(message.text || "").match(/^\/(start|play|profile|notifications|language)(?:@\w+)?(?:\s|$)/)?.[1];
  if (!command) return;
  await changePreferences(message.from.id, {}, message.from);
  const notifications = command === "notifications" || /^\/start(?:@\w+)?\s+notifications$/.test(String(message.text || "").trim());
  if (notifications) {
    const row = await ensurePreferences(message.from.id);
    if (!["ru", "en"].includes(JSON.parse(row.prefsJson || "{}").language)) {
      await api.sendMessage({ chat_id: message.chat.id, text: "Выбери язык / Choose your language", reply_markup: notificationLanguageMenu });
      return;
    }
    const language = await languageFor(message.from.id);
    await api.sendMessage({ chat_id: message.chat.id, text: preferenceText(language), reply_markup: await preferenceMenu(message.from.id) });
    return;
  }
  if (command === "start" || command === "language") {
    await api.sendMessage({ chat_id: message.chat.id, text: "Выбери язык / Choose your language", reply_markup: languageMenu });
    return;
  }
  const language = await languageFor(message.from.id);
  if (command === "notifications" || String(message.text).includes("start notifications")) {
    await api.sendMessage({ chat_id: message.chat.id, text: preferenceText(language), reply_markup: await preferenceMenu(message.from.id) });
    return;
  }
  await sendWelcome(message.chat.id, language);
}
