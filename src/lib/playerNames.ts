import { isFootballMononym } from './footballNames.ts';
/** Prefer the stored surname, which also preserves single and two-word football names. */
export function playerDisplayName(fullName: string, lastName: string) {
  const full = fullName.trim();
  const stored = lastName.trim();
  // Historical imports stored the entire canonical name in lastName.
  const legacyFull = stored.toLocaleLowerCase() === full.toLocaleLowerCase() && /\s/.test(full);
  const surname = isFootballMononym(full) ? full : (!legacyFull && stored) || full.split(/\s+/).at(-1) || full;
  const at = full.toLocaleLowerCase().indexOf(surname.toLocaleLowerCase());
  const given = at < 0 ? '' : `${full.slice(0, at)} ${full.slice(at + surname.length)}`.trim();
  return { surname, given };
}
