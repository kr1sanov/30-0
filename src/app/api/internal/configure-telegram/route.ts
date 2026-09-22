import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/telegramSession';

export const dynamic = 'force-dynamic';

const APP_DIR = process.env.JINO_APP_DIR || '/home/users/j/j97915155/domains/30-0.xn--p1ai';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Недопустимый источник запроса' }, { status: 403 });
  if (process.env.TELEGRAM_BOT_TOKEN) return NextResponse.json({ error: 'Telegram уже настроен' }, { status: 409 });

  try {
    const body = await request.json();
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!/^[1-9][0-9]{5,11}:[A-Za-z0-9_-]{30,}$/.test(token)) {
      return NextResponse.json({ error: 'Некорректный токен' }, { status: 400 });
    }

    const tokenBotId = token.split(':', 1)[0];
    if (tokenBotId !== process.env.TELEGRAM_CLIENT_ID) {
      return NextResponse.json({ error: 'Токен не принадлежит @RPL30_bot' }, { status: 403 });
    }

    const envPath = path.join(APP_DIR, '.env');
    const current = await readFile(envPath, 'utf8');
    const next = `${current.replace(/\n?TELEGRAM_BOT_TOKEN=.*(?:\n|$)/g, '\n').trimEnd()}\nTELEGRAM_BOT_TOKEN=${token}\n`;
    const temporaryPath = `${envPath}.telegram-${process.pid}`;
    await writeFile(temporaryPath, next, { mode: 0o600 });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, envPath);
    process.env.TELEGRAM_BOT_TOKEN = token;

    setTimeout(() => {
      void mkdir(path.join(APP_DIR, 'tmp'), { recursive: true })
        .then(() => writeFile(path.join(APP_DIR, 'tmp', 'restart.txt'), new Date().toISOString()))
        .catch(() => undefined);
    }, 500);

    return NextResponse.json({ ok: true, bot: '@RPL30_bot' });
  } catch {
    return NextResponse.json({ error: 'Не удалось сохранить настройку' }, { status: 500 });
  }
}
