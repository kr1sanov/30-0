export function decodeImage(encoded) {
  if (typeof encoded !== 'string' || encoded.length > 14000000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw new Error('Invalid image');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes = new Uint8Array(encoded.length / 4 * 3 - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0));
  let at = 0;
  for (let i = 0; i < encoded.length; i += 4) {
    const n = (alphabet.indexOf(encoded[i]) << 18) | (alphabet.indexOf(encoded[i+1]) << 12) | (Math.max(0,alphabet.indexOf(encoded[i+2])) << 6) | Math.max(0,alphabet.indexOf(encoded[i+3]));
    if (at < bytes.length) bytes[at++] = n >> 16;
    if (at < bytes.length) bytes[at++] = n >> 8;
    if (at < bytes.length) bytes[at++] = n;
  }
  return bytes;
}
export async function deliverNotification(message, store, send) {
  if (!message || typeof message.id !== 'string' || message.id.length > 100 || !Number.isSafeInteger(message.chatId) || message.chatId <= 0 || !['invitations','results','friends','friend_updates','news'].includes(message.category) || typeof message.text !== 'string' || message.text.length > (message.image ? 1024 : 4096)) throw new Error('Invalid notification');
  const preference = await store.preferences(message.chatId);
  if (!preference?.started) return {ok:false, retryAfter:300};
  if (!preference.enabled || !preference[message.category]) return {ok:true, skipped:true};
  const prior = await store.claim(message.id, message.chatId);
  if (prior === 'sent') return {ok:true};
  if (prior !== 'claimed') return {ok:false, retryAfter:120};
  try {
    await send(message, message.image ? decodeImage(message.image) : null);
    await store.finish(message.id, 'sent');
    return {ok:true};
  } catch (error) {
    await store.finish(message.id, 'pending');
    return {ok:false, errorCode:typeof error?.code === 'number' ? error.code : undefined, retryAfter:error?.parameters?.retry_after};
  }
}
