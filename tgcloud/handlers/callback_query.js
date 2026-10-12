import { api } from 'sdk';
import { syncUser } from '../lib/bridge.js';

export default async function (query) {
  if (query.message?.chat?.type !== 'private' || !query.from || !['notifications-on', 'notifications-off'].includes(query.data)) return;
  const enabled = query.data === 'notifications-on';
  const saved = await syncUser(query.from, enabled);
  // The bridge may be unavailable: acknowledge the tap without falsely claiming persistence.
  await api.answerCallbackQuery({ callback_query_id: query.id, text: saved ? enabled ? 'Notifications on / Уведомления включены' : 'Notifications off / Уведомления отключены' : 'Could not save. Open your profile / Не удалось сохранить. Открой профиль' });
}
