import { api, InputFile } from "sdk";
import { defaults, normalize, ensurePreferences } from "./preferences.js";
import { welcomeImage } from "./welcomeImage.js";
export async function languageFor(tgId) {
  const row = await ensurePreferences(tgId);
  return JSON.parse(row.prefsJson || "{}").language === "en" ? "en" : "ru";
}
export const languageMenu = { inline_keyboard: [[
  { text: "🇷🇺 Русский", callback_data: "language:ru" },
  { text: "🇬🇧 English", callback_data: "language:en" },
]] };
export const notificationLanguageMenu = { inline_keyboard: languageMenu.inline_keyboard.map(row => row.map(button => ({ ...button, callback_data: button.callback_data + ":notifications" }))) };
export async function mainMenu(language = "ru") {
  const me = await api.getMe();
  const base = `https://t.me/${me.username}?startapp`;
  const ru = language === "ru";
  return { inline_keyboard: [
    [{ text: ru ? "⚽ Играть" : "⚽ Play", url: base }, { text: ru ? "Мой профиль" : "My profile", url: base + "=my_profile" }],
    [{ text: ru ? "🔔 Уведомления" : "🔔 Notifications", callback_data: "preferences" }, { text: ru ? "🌐 Язык" : "🌐 Language", callback_data: "language" }],
  ] };
}
export async function sendWelcome(chatId, language) {
  const caption = language === "en"
    ? "<b>Can your dream team win every match? ⚽</b>\n\nSpin a club and season, pick a player and build your RPL XI across generations. Then simulate 30 matches. The goal: 30 wins, zero defeats.\n\nMix clubs in Classic Draft, bring generations together in One Club, take on Challenges or compete with friends.\n\n<b>Your first pick awaits. Tap Play!</b>"
    : "<b>Твой состав сможет выиграть все матчи? ⚽</b>\n\nКрути клуб и сезон, выбирай игрока и собирай свою команду из разных поколений РПЛ. Затем сыграй сезон из 30 матчей. Цель — 30 побед и ни одного поражения.\n\nОбъединяй клубы в обычном драфте, собирай легенд любимой команды в «Один клуб», проходи челленджи или соревнуйся с друзьями.\n\n<b>Первый выбор за тобой. Жми «Играть»!</b>";
  const reply_markup = await mainMenu(language);
  try { await api.sendPhoto({ chat_id: chatId, photo: new InputFile(welcomeImage(), "30-0.png", { type: "image/png" }), caption, parse_mode: "HTML", reply_markup }); }
  catch { await api.sendMessage({ chat_id: chatId, text: caption, parse_mode: "HTML", reply_markup }); }
}
export function preferenceText(language = "ru") {
  return language === "en"
    ? "🔔 Your notifications\n\nChoose what matters to you: results, invitations and friend requests. Project news is optional. These choices also apply in your game profile. Turning off notifications keeps your category choices."
    : "🔔 Твои уведомления\n\nВыбирай то, что интересно: результаты, приглашения и заявки в друзья. Новости проекта — по желанию. Настройки общие для бота и профиля в игре. При отключении уведомлений выбранные категории сохранятся.";
}
export async function preferenceMenu(tgId) {
  const row = await ensurePreferences(tgId);
  const p = normalize(row.prefsJson);
  const ru = await languageFor(tgId) === "ru";
  const labels = ru
    ? { enabled: "Получать уведомления", news: "Новости проекта", invitations: "Приглашения в игры", results: "Результаты сезонов", friends: "Заявки в друзья", friend_updates: "Ответы на заявки" }
    : { enabled: "Allow notifications", news: "Project news", invitations: "Game invitations", results: "Season results", friends: "Friend requests", friend_updates: "Request updates" };
  return { inline_keyboard: [ ...Object.keys(defaults).map(key => [{ text: `${p[key] ? "✅" : "⬜"} ${labels[key]}`, callback_data: "pref:" + key }]), [{ text: ru ? "← Главное меню" : "← Main menu", callback_data: "menu" }] ] };
}
