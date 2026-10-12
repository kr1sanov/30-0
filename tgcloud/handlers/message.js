import { api, InputFile } from "sdk";
import { changePreferences } from "../lib/preferences.js";
import { mainMenu, preferenceMenu, preferenceText } from "../lib/menu.js";
import { welcomeImage } from "../lib/welcomeImage.js";
export default async function handleMessage(message) {
  if (message.chat?.type !== "private" || !message.from) return;
  const command = String(message.text || "").match(
    /^\/(start|play|profile|notifications)(?:@\w+)?(?:\s|$)/,
  )?.[1];
  if (!command) return;
  await changePreferences(message.from.id, {}, message.from);
  if (
    command === "notifications" ||
    String(message.text).includes("start notifications")
  ) {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: preferenceText,
      reply_markup: await preferenceMenu(message.from.id),
    });
    return;
  }
  const reply_markup = await mainMenu();
  const caption =
    "<b>30-0 · RPL Draft ⚽</b>\n\nBuild your dream squad from Russian Premier League players. Play a 30-match season and aim for 30 wins.\n\nTry Classic Draft, One Club and Challenges, or compete with friends in Multiplayer. Track your results, unlock achievements and invite your friends.\n\nReady to build your team?";
  try {
    await api.sendPhoto({
      chat_id: message.chat.id,
      photo: new InputFile(welcomeImage(), "30-0.png", { type: "image/png" }),
      caption,
      parse_mode: "HTML",
      reply_markup,
    });
  } catch {
    await api.sendMessage({
      chat_id: message.chat.id,
      text: caption,
      parse_mode: "HTML",
      reply_markup,
    });
  }
}
