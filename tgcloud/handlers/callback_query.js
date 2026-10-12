import { api } from "sdk";
import { changePreferences, defaults } from "../lib/preferences.js";
import { mainMenu, preferenceMenu, preferenceText } from "../lib/menu.js";
export default async function handleCallback(query) {
  if (query.message?.chat?.type !== "private" || !query.from) return;
  if (query.data === "menu") {
    await api.answerCallbackQuery({ callback_query_id: query.id });
    await api.sendMessage({
      chat_id: query.message.chat.id,
      text: "30-0 · Build your squad and play.",
      reply_markup: await mainMenu(),
    });
    return;
  }
  if (query.data !== "preferences" && !String(query.data).startsWith("pref:"))
    return;
  try {
    if (query.data.startsWith("pref:")) {
      const key = query.data.slice(5);
      if (!Object.hasOwn(defaults, key)) return;
      await changePreferences(query.from.id, { [key]: "toggle" }, query.from);
    }
    const reply_markup = await preferenceMenu(query.from.id);
    if (query.data === "preferences" || query.message.photo)
      await api.sendMessage({
        chat_id: query.message.chat.id,
        text: preferenceText,
        reply_markup,
      });
    else
      await api.editMessageText({
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        text: preferenceText,
        reply_markup,
      });
    await api.answerCallbackQuery({
      callback_query_id: query.id,
      text: query.data === "preferences" ? "" : "Saved",
    });
  } catch {
    await api.answerCallbackQuery({
      callback_query_id: query.id,
      text: "Could not update settings. Please retry.",
    });
  }
}
