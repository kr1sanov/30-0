import { open, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = join(appDir, '.telegram-poll.lock');
const offsetPath = join(appDir, '.telegram-update-offset');
const photoPath = join(appDir, '.next/standalone/public/telegram-start.png');
const caption = '<b>30-0 · Драфт РПЛ</b> ⚽\nСобери команду из игроков РПЛ разных сезонов, сыграй сезон из 30 матчей и попробуй победить во всех. Играй сам или с друзьями.';
const replyMarkup = { inline_keyboard: [[{ text: 'Играть', url: 'https://t.me/RPL30_bot?startapp' }]] };

async function telegram(token, method, options = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    ...options, signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`Telegram ${method}: ${result.description || response.status}`);
  return result.result;
}

async function sendWelcome(token, chatId) {
  const image = await readFile(photoPath).catch(() => readFile(join(appDir, 'public/telegram-start.png')).catch(() => null));
  if (image) {
    try {
      const form = new FormData();
      form.set('chat_id', String(chatId));
      form.set('caption', caption);
      form.set('parse_mode', 'HTML');
      form.set('reply_markup', JSON.stringify(replyMarkup));
      form.set('photo', new Blob([image], { type: 'image/png' }), '30-0.png');
      await telegram(token, 'sendPhoto', { method: 'POST', body: form });
      return;
    } catch (error) { console.error('Telegram photo failed, trying text:', error); }
  }
  await telegram(token, 'sendMessage', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: caption, parse_mode: 'HTML', reply_markup: replyMarkup }) });
}

export async function pollOnce() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
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
    const stored = Number((await readFile(offsetPath, 'utf8').catch(() => '0')).trim());
    let offset = Number.isSafeInteger(stored) && stored >= 0 ? stored : 0;
    const updates = await telegram(token, 'getUpdates', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ offset, timeout: 0, limit: 100, allowed_updates: ['message'] }),
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
        await sendWelcome(token, message.chat.id);
        delivered++;
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
