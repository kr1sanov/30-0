import { open, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = join(appDir, '.telegram-poll.lock');
const offsetPath = join(appDir, '.telegram-update-offset');
const photoPath = join(appDir, '.next/standalone/public/telegram-start.png');
const caption = '<b>30-0 · Драфт РПЛ</b> ⚽\nСобери команду из игроков РПЛ разных сезонов, сыграй сезон из 30 матчей и попробуй победить во всех. Играй сам или с друзьями.';

async function telegram(token, method, options = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    ...options, signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`Telegram ${method}: ${result.description || response.status}`);
  return result.result;
}

async function sendWelcome(token, chatId, language = 'ru') {
  const welcomeCaption = language.startsWith('ru') ? caption : '<b>30-0 · RPL Draft</b> ⚽\nDraft a squad, play 30 matches and try to win them all. Play on your own or with friends.';
  const markup = { inline_keyboard: [[{ text: language.startsWith('ru') ? 'Играть' : 'Play', url: 'https://t.me/RPL30_bot?startapp' }], [{ text: language.startsWith('ru') ? 'Мой профиль' : 'My profile', url: 'https://t.me/RPL30_bot?startapp=my_profile' }]] };
  const image = await readFile(photoPath).catch(() => readFile(join(appDir, 'public/telegram-start.png')).catch(() => null));
  if (image) {
    try {
      const form = new FormData();
      form.set('chat_id', String(chatId));
      form.set('caption', welcomeCaption);
      form.set('parse_mode', 'HTML');
      form.set('reply_markup', JSON.stringify(markup));
      form.set('photo', new Blob([image], { type: 'image/png' }), '30-0.png');
      await telegram(token, 'sendPhoto', { method: 'POST', body: form });
      return;
    } catch (error) { console.error('Telegram photo failed, trying text:', error); }
  }
  await telegram(token, 'sendMessage', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: welcomeCaption, parse_mode: 'HTML', reply_markup: markup }) });
}

async function syncProfile(user, enabled) {
  let db;
  try {
    let PrismaClient;
    try { ({ PrismaClient } = createRequire(join(appDir, '.next/standalone/server.js'))('@prisma/client')); }
    catch { ({ PrismaClient } = createRequire(import.meta.url)('@prisma/client')); }
    db = new PrismaClient();
    const firstName = user.first_name || null;
    const username = user.username || null;
    await db.user.upsert({ where: { providerId: `telegram_${user.id}` }, create: { provider: 'telegram', providerId: `telegram_${user.id}`, firstName, lastName: user.last_name || null, username, displayName: firstName || username || 'Player', telegramChatStarted: true, ...(typeof enabled === 'boolean' ? { telegramNotificationsEnabled: enabled } : {}) },
      update: { telegramChatStarted: true, lastActiveAt: new Date(), ...(typeof enabled === 'boolean' ? { telegramNotificationsEnabled: enabled } : {}) } });
    return true;
  } catch { console.warn('Telegram profile sync unavailable'); return false; }
  finally { await db?.$disconnect(); }
}

export async function pollOnce() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || process.env.TELEGRAM_BOT_TRANSPORT === 'serverless') return;
  let lock;
  try {
    lock = await open(lockPath, 'wx', 0o600);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const age = Date.now() - (await stat(lockPath).catch(() => ({ mtimeMs: Date.now() }))).mtimeMs;
    if (age > 180_000) await unlink(lockPath).catch(() => undefined);
    return;
  }
  try {
    const webhook = await telegram(token, 'getWebhookInfo');
    if (webhook.url) return; // Never compete with a platform-managed webhook.
    const stored = Number((await readFile(offsetPath, 'utf8').catch(() => '0')).trim());
    let offset = Number.isSafeInteger(stored) && stored >= 0 ? stored : 0;
    const updates = await telegram(token, 'getUpdates', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ offset, timeout: 0, limit: 100, allowed_updates: ['message', 'callback_query'] }),
    });
    // Several /start taps queued during the webhook outage become one greeting.
    const latestByChat = new Map();
    for (const update of updates) {
      const message = update.message;
      if (message?.chat?.type === 'private' && /^\/start(?:\s|$)/.test(message.text || ''))
        latestByChat.set(String(message.chat.id), update.update_id);
    }
    let delivered = 0;
    for (const update of updates) {
      const message = update.message;
      if (message?.chat?.type === 'private' && latestByChat.get(String(message.chat.id)) === update.update_id) {
        await sendWelcome(token, message.chat.id, message.from?.language_code || 'ru');
        await syncProfile(message.from);
        delivered++;
      }
      const query = update.callback_query;
      if (query?.from && query.message?.chat?.type === 'private' && ['notifications-on', 'notifications-off'].includes(query.data)) {
        const enabled = query.data === 'notifications-on';
        const saved = await syncProfile(query.from, enabled);
        await telegram(token, 'answerCallbackQuery', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ callback_query_id: query.id, text: saved ? enabled ? 'Notifications on / Уведомления включены' : 'Notifications off / Уведомления отключены' : 'Open your profile / Открой профиль' }) });
      }
      offset = update.update_id + 1;
      await writeFile(offsetPath, String(offset), { mode: 0o600 });
    }
    console.log(`Telegram polling: processed ${updates.length} updates, delivered ${delivered} welcomes`);
  } finally {
    await lock.close();
    await unlink(lockPath).catch(() => undefined);
  }
}

export function startPolling() {
  void pollOnce().catch(error => console.error('Telegram polling:', error));
  setInterval(() => void pollOnce().catch(error => console.error('Telegram polling:', error)), 12_000).unref();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  pollOnce().catch(error => { console.error('Telegram polling:', error); process.exitCode = 1; });
}
