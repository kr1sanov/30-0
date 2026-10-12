import { api } from 'sdk';
import { syncUser } from '../lib/bridge.js';

export default async function (message) {
  if (message.chat?.type !== 'private' || !message.from) return;
  const en = !String(message.from.language_code || 'ru').startsWith('ru');
  const command = String(message.text || '').match(/^\/(start|play|profile|notifications)(?:@\w+)?(?:\s|$)/)?.[1];
  if (!command) return;
  const me = await api.getMe();
  const base = `https://t.me/${me.username}?startapp`;
  const reply_markup = { inline_keyboard: [
    [{ text: en ? 'Play 30-0' : 'Играть в 30-0', url: base }],
    [{ text: en ? 'My profile' : 'Мой профиль', url: `${base}=my_profile` }],
    [{ text: en ? 'Notifications on' : 'Включить уведомления', callback_data: 'notifications-on' },
     { text: en ? 'Notifications off' : 'Отключить уведомления', callback_data: 'notifications-off' }],
  ] };
  await api.sendMessage({ chat_id: message.chat.id, text: en ? '30-0 · RPL Draft ⚽\nDraft a squad, play 30 matches and try to win them all. Play on your own or with friends.' : '30-0 · Драфт РПЛ ⚽\nСобери состав, сыграй 30 матчей и попробуй выиграть все. Играй сам или с друзьями.', reply_markup });
  await syncUser(message.from);
}
