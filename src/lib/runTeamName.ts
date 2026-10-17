import { localizedClubName } from './clubDisplayName.ts';
export function runTeamName(mode: string, clubName: string | null | undefined, username: string | null | undefined, displayName: string | null | undefined) {
  if (mode === 'single_club' && clubName) return localizedClubName(clubName, 'ru');
  if (!mode.startsWith('challenge_')) return username ? `@${username.replace(/^@/, '')}` : displayName || 'Моя команда';
  return 'Моя команда';
}
