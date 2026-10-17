import { campaignStillRelevant } from './campaignDelivery';
import { db } from './db';
import { preferenceData, preferencesFromUser, notificationAllowed, validPreferencePatch, type NotificationCategory } from './notificationPreferences';
import { activeRestriction } from './moderation';
import { localizeBotMessage, localizeBotButton } from './botLanguage';
import { seasonResultImage } from './seasonResultNotification';

export async function relayAction(body: Record<string, unknown>) {
  if (body.action === 'recipients') {
    const queued = await db.telegramOutbox.findMany({ where: { status: 'pending', sentAt: null, attempts: { lt: 5 }, availableAt: { lte: new Date() } }, orderBy: { availableAt: 'asc' }, select: { userId: true }, distinct: ['userId'], take: 20 });
    const users = await db.user.findMany({ where: { id: { in: queued.map(item => item.userId) } }, select: { providerId: true } });
    return { tgIds: users.map(user => Number(user.providerId.replace('telegram_', ''))).filter(id => Number.isSafeInteger(id) && id > 0) };
  }
  if (body.action === 'patches') {
    const users = await db.user.findMany({ where: { pendingNotificationPatch: { not: null } }, take: 100, select: { id: true, providerId: true, pendingNotificationPatch: true } });
    return { patches: users.map(user => ({ userId: user.id, tgId: Number(user.providerId.replace('telegram_', '')), version: user.pendingNotificationPatch, patch: JSON.parse(user.pendingNotificationPatch!) })) };
  }
  if (body.action === 'sync') {
    const records = body.records;
    if (!Array.isArray(records) || records.length > 100) throw new Error('Invalid batch');
    for (const item of records) {
      if (!Number.isSafeInteger(item.tgId) || item.tgId <= 0 || !Number.isInteger(item.revision) || !validPreferencePatch(item.preferences)) throw new Error('Invalid preferences');
      const syncedUser = await db.$transaction(async tx => {
        const providerId = `telegram_${item.tgId}`;
        const user = await tx.user.upsert({ where: { providerId }, create: { provider: 'telegram', providerId, displayName: [item.user?.first_name, item.user?.last_name].filter(Boolean).join(' ') || 'Telegram player' }, update: {} });
        // An acknowledgement clears only the exact application patch it delivered.
        const acknowledged = item.patchVersion && user.pendingNotificationPatch === item.patchVersion;
        const pending = acknowledged ? {} : JSON.parse(user.pendingNotificationPatch || '{}');
        if (item.revision >= user.notificationsRevision) await tx.user.update({ where: { id: user.id }, data: {
          ...preferenceData({ ...item.preferences, ...pending }), notificationsRevision: item.revision,
          ...(item.started ? { telegramChatStarted: true } : {}), botLanguage: item.language === 'en' ? 'en' : 'ru',
          ...(acknowledged ? { pendingNotificationPatch: null } : {}),
        } });
        return { id: user.id, started: user.telegramChatStarted || Boolean(item.started) };
      });
      if (!syncedUser.started) await db.telegramOutbox.updateMany({ where: { userId: syncedUser.id, status: 'pending', attempts: 0 }, data: { availableAt: new Date(Date.now() + 300_000) } });
    }
    return { ok: true };
  }
  if (body.action === 'claim') {
    const now = new Date();
    await db.telegramOutbox.updateMany({ where: { status: 'pending', attempts: { gte: 5 }, availableAt: { lte: now } }, data: { status: 'failed', lastError: 'Delivery attempts exhausted' } });
    const hydrated = Array.isArray(body.tgIds) ? body.tgIds.filter(id => Number.isSafeInteger(id) && Number(id) > 0).map(id => `telegram_${id}`) : null;
    const eligible = await db.user.findMany({ where: { telegramChatStarted: true, ...(hydrated ? { providerId: { in: hydrated } } : {}) }, select: { id: true } });
    const pending = await db.telegramOutbox.findMany({ where: { userId: { in: eligible.map(user => user.id) }, sentAt: null, status: 'pending', attempts: { lt: 5 }, availableAt: { lte: now } }, orderBy: { createdAt: 'asc' }, take: 5 });
    const messages: Array<{ id: string; attempt: number; chatId: number; category: string; text: string | null; keyboard: object; image: string | null }> = [];
    for (const item of pending) {
      const user = await db.user.findUnique({ where: { id: item.userId } });
      if (!user) continue;
      const category = (item.eventKey.startsWith('invite:') ? 'invitations' : item.eventKey.startsWith('accepted:') ? 'friend_updates' : item.category) as NotificationCategory;
      if (!user.telegramChatStarted) continue; // Bot /start can still authorize delivery later.
      const claim = await db.telegramOutbox.updateMany({ where: { id: item.id, attempts: item.attempts, status: 'pending', sentAt: null, availableAt: { lte: now } }, data: { attempts: { increment: 1 }, availableAt: new Date(Date.now()+120_000) } });
      if (!claim.count) continue;
      let expired = !await campaignStillRelevant(item, now);
      if (item.eventKey.startsWith('invite:')) {
        const invite = await db.multiplayerInvite.findUnique({ where: { id: item.eventKey.split(':')[1] } });
        const room = invite ? await db.multiplayerRoom.findUnique({ where: { code: invite.roomCode }, select: { status: true } }) : null;
        expired = !invite || invite.status !== 'pending' || room?.status !== 'lobby';
      } else if (item.eventKey.startsWith('friend:')) {
        const friendship = await db.friendship.findUnique({ where: { id: item.eventKey.slice(7) } });
        expired = friendship?.status !== 'pending';
      }
      if (expired) { await db.telegramOutbox.update({ where: { id: item.id }, data: { status: 'skipped', sentAt: now, lastError: 'Event no longer active' } }); continue; }
      if (!notificationAllowed(preferencesFromUser(user), category) || user.deleteAfterAt || activeRestriction(user)) {
        await db.telegramOutbox.update({ where: { id: item.id }, data: { status: 'skipped', sentAt: now } }); continue;
      }
      const language = user.botLanguage === 'en' ? 'en' : 'ru';
      if (category === 'news' && language === 'en' && !item.textEn) { await db.telegramOutbox.update({ where: { id: item.id }, data: { status: 'skipped', sentAt: now } }); continue; }
      let image = item.imageId ? (await db.mediaAsset.findUnique({ where: { id: item.imageId } }))?.data : undefined;
      if (category === 'results' && item.eventKey.startsWith('result:')) {
        const run = await db.gameRun.findUnique({ where: { id: item.eventKey.slice(7) }, include: { user: true } });
        if (run?.user) image = await seasonResultImage({ ...run, user: run.user }, language);
      }
      messages.push({ category, id: item.id, attempt: item.attempts+1, chatId: Number(user.providerId.replace('telegram_', '')),
        text: category === 'news' ? (language === 'en' ? item.textEn : item.text) : localizeBotMessage(item.text, language),
        keyboard: { inline_keyboard: [[{ text: category === 'news' ? (language === 'en' ? item.buttonTextEn || item.buttonText : item.buttonText) : localizeBotButton(item.buttonText || 'Open 30-0', language), url: item.buttonUrl || `https://t.me/RPL30_bot?startapp=${encodeURIComponent(item.startParam)}` }]] },
        image: image ? Buffer.from(image).toString('base64') : null });
    }
    return { messages };
  }
  if (body.action === 'ack') {
    if (typeof body.id !== 'string' || !Number.isInteger(body.attempt) || typeof body.ok !== 'boolean') throw new Error('Invalid acknowledgement');
    await db.telegramOutbox.updateMany({ where: { id: body.id, attempts: body.attempt as number, status: 'pending', sentAt: null }, data: body.ok
      ? { sentAt: new Date(), status: body.skipped === true ? 'skipped' : 'sent', lastError: null }
      : { status: (body.attempt as number) >= 5 ? 'failed' : 'pending', lastError: typeof body.errorCode === 'number' ? `Telegram ${body.errorCode}` : 'Telegram delivery failed', availableAt: new Date(Date.now() + Math.max(60 * 2 ** (body.attempt as number), typeof body.retryAfter === 'number' ? Math.min(3600, Math.max(0, body.retryAfter)) : 0) * 1000) } });
    return { ok: true };
  }
  throw new Error('Unknown action');
}
