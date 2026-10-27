import { timingSafeEqual } from 'node:crypto';

/** Compare bytes, not JS character counts (non-ASCII input must not throw). */
export function secretsMatch(expected: string | undefined, supplied: string): boolean {
  if (!expected) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}
