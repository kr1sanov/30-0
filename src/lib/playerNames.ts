import { isFootballMononym } from './footballNames.ts';
/** Prefer the stored surname, which also preserves single and two-word football names. */
export function playerDisplayName(fullName: string, lastName: string) {
  const full = fullName.trim();
  const surname = isFootballMononym(full) ? full : lastName.trim() || full.split(/\s+/).at(-1) || full;
  const at = full.toLocaleLowerCase().indexOf(surname.toLocaleLowerCase());
  const given = at < 0 ? '' : `${full.slice(0, at)} ${full.slice(at + surname.length)}`.trim();
  return { surname, given };
}
