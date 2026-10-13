import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { localizeBotMessage, localizeBotButton } from '../src/lib/botLanguage.ts';

test('automatic notifications preserve player names and numbers in RU and EN', () => {
  assert.equal(localizeBotMessage('Nik &amp; Alex invites you to play 30-0.', 'en'), 'Nik &amp; Alex invites you to play 30-0.');
  assert.match(localizeBotMessage('Nik &amp; Alex invites you to play 30-0.', 'ru'), /^Nik &amp; Alex приглашает/);
  assert.match(localizeBotMessage('<b>Season complete! ⚽</b>\n30 wins · 0 draws · 0 losses\n90 points · Place 1', 'ru'), /30 побед · 0 ничьих · 0 поражений\n90 очков · Место 1/);
  assert.equal(localizeBotButton('View season result', 'ru'), 'Посмотреть результат');
});

test('start asks for a language before welcome; language and preferences survive menu navigation', async () => {
  const messages: Array<Record<string, unknown>> = [];
  let row = { tgId: 123, prefsJson: '{}', userJson: '{}', revision: 1, started: 0 };
  const api = Object.fromEntries(['sendMessage', 'sendPhoto', 'editMessageText', 'answerCallbackQuery'].map(name => [name, async (data: Record<string, unknown>) => { messages.push({ method: name, ...data }); }]));
  (api as Record<string, unknown>).getMe = async () => ({ username: 'RPL30_bot' });
  const fixture = { api, db: {
    insert: () => ({ values: () => ({ onConflictDoNothing: () => ({ run: async () => undefined }) }) }),
    select: () => ({ from: () => ({ where: () => ({ get: async () => ({ ...row }) }) }) }),
    update: () => ({ set: (data: typeof row) => ({ where: () => ({ returning: () => ({ run: async () => { row = { ...row, ...data }; return [row]; } }) }) }) }),
  } };
  const globalFixture = globalThis as typeof globalThis & { botLanguageFixture?: typeof fixture };
  globalFixture.botLanguageFixture = fixture;
  const urls = new Map<string, string>();
  const uri = (source: string) => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
  function load(path: string): string {
    if (urls.has(path)) return urls.get(path)!;
    let source = readFileSync(path, 'utf8');
    source = source.replace(/from "([^"]+)"/g, (_, specifier: string) => {
      const url = specifier === 'sdk' ? uri('export const {api,db} = globalThis.botLanguageFixture; export class InputFile { constructor() {} }')
        : specifier === 'sdk/db' ? uri('export const table = (_, fields) => fields; export const integer = () => ({ primaryKey() { return this; }, notNull() { return this; }, default() { return this; } }); export const text = integer; export const eq = () => true; export const and = () => true;')
        : load(resolve(dirname(path), specifier));
      return `from ${JSON.stringify(url)}`;
    });
    const result = uri(source); urls.set(path, result); return result;
  }
  try {
    const { default: message } = await import(load(resolve('tgcloud/handlers/message.js')));
    const { default: callback } = await import(load(resolve('tgcloud/handlers/callback_query.js')));
    const from = { id: 123, first_name: 'Test', language_code: 'ru' }, chat = { id: 123, type: 'private' };
    await message({ chat, from, text: '/start' });
    assert.equal(messages.length, 1);
    assert.equal(messages[0].method, 'sendMessage');
    assert.match(String(messages[0].text), /Choose your language/);
    await callback({ id: '1', from, message: { chat }, data: 'language:en' });
    assert.match(String(messages.find(item => item.method === 'sendPhoto')?.caption), /30 wins/);
    assert.equal(JSON.parse(row.prefsJson).language, 'en');
    await message({ chat, from, text: '/start notifications' });
    assert.match(String(messages.at(-1)?.text), /Your notifications/);
    assert.ok((messages.at(-1)?.reply_markup as { inline_keyboard: unknown[][] }).inline_keyboard.length > 1);
    await callback({ id: '2', from, message: { chat }, data: 'pref:news' });
    assert.equal(JSON.parse(row.prefsJson).news, true);
    assert.equal(JSON.parse(row.prefsJson).language, 'en');
    await message({ chat, from, text: '/start' });
    assert.equal(JSON.parse(row.prefsJson).language, 'en');
    await callback({ id: '3', from, message: { chat }, data: 'language:ru' });
    assert.equal(JSON.parse(row.prefsJson).news, true);
    await callback({ id: '4', from, message: { chat }, data: 'preferences' });
    assert.match(String(messages.at(-2)?.text), /Твои уведомления/);
    row.prefsJson = JSON.stringify({ news: true });
    await message({ chat, from, text: '/start notifications' });
    assert.match(String(messages.at(-1)?.text), /Choose your language/);
    await callback({ id: '5', from, message: { chat }, data: 'language:en:notifications' });
    assert.ok(messages.some(message => String(message.text).includes('Your notifications')));
    assert.equal(JSON.parse(row.prefsJson).language, 'en');
  } finally { delete globalFixture.botLanguageFixture; }
});
