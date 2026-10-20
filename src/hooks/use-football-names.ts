'use client';
import { useCallback, useSyncExternalStore } from 'react';
import { useUiLanguage } from './use-ui-translation';
import { localizePlayerName, subscribeFootballNames, footballNamesVersion } from '@/lib/footballNames';
import { localizedClubName } from '@/lib/clubDisplayName';
import { playerDisplayName } from '@/lib/playerNames';

export function useFootballNames() {
  const language = useUiLanguage();
  const version = useSyncExternalStore(subscribeFootballNames, footballNamesVersion, () => 0);
  const player = useCallback((name: string | null | undefined) => localizePlayerName(name, language), [language, version]);
  const club = useCallback((name: string | null | undefined) => localizedClubName(name, language), [language, version]);
  const displayName = useCallback((fullName: string, lastName: string) => {
    const parts = playerDisplayName(fullName, lastName);
    return { surname: player(parts.surname), given: player(parts.given) };
  }, [player]);
  return { player, club, displayName, language };
}
