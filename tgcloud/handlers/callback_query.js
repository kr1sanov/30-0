import { api } from "sdk";
import { changePreferences, defaults } from "../lib/preferences.js";
import { languageFor, languageMenu, sendWelcome, preferenceMenu, preferenceText } from "../lib/menu.js";
export default async function handleCallback(query) {
  if (query.message?.chat?.type !== "private" || !query.from) return;
  const language = await languageFor(query.from.id);
  const selection = String(query.data).match(/^language:(ru|en)(:notifications)?$/);
  if (query.data === "language" || selection) {
    if (query.data === "language") await api.sendMessage({ chat_id: query.message.chat.id, text: "Выбери язык / Choose your language", reply_markup: languageMenu });
    else {
      const next = selection[1];
      await changePreferences(query.from.id, { language: next }, query.from);
      if (selection[2]) await api.sendMessage({ chat_id: query.message.chat.id, text: preferenceText(next), reply_markup: await preferenceMenu(query.from.id) });
      else await sendWelcome(query.message.chat.id, next);
    }
    await api.answerCallbackQuery({ callback_query_id: query.id });
    return;
  }
  if (query.data === "menu") {
    await api.answerCallbackQuery({ callback_query_id: query.id });
    await sendWelcome(query.message.chat.id, language);
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
        text: preferenceText(language),
        reply_markup,
      });
    else
      await api.editMessageText({
        chat_id: query.message.chat.id,
        message_id: query.message.message_id,
        text: preferenceText(language),
        reply_markup,
      });
    await api.answerCallbackQuery({
      callback_query_id: query.id,
      text: query.data === "preferences" ? "" : language === "ru" ? "Сохранено" : "Saved",
    });
  } catch {
    await api.answerCallbackQuery({
      callback_query_id: query.id,
      text: language === "ru" ? "Не удалось сохранить. Попробуй ещё раз." : "Could not update settings. Please retry.",
    });
  }
}
