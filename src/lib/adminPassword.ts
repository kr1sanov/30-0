import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashAdminPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyAdminPassword(password: string, stored: string) {
  const [salt, encoded] = stored.split(':');
  if (!salt || !encoded || !/^[a-f0-9]{32}$/i.test(salt) || !/^[a-f0-9]{128}$/i.test(encoded)) return false;
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(encoded, 'hex'));
}
