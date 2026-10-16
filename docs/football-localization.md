# Football names and languages

Football IDs and source names remain unchanged. `useFootballNames` selects display labels using the existing RU/EN language preference (with an independent admin preference). Club aliases cover every name from all supplied editions, including historical names and the 2022–2025 newcomers.

The player list renders surname first in bold, then given name; alphabetical sorting uses the displayed surname and selected language. The pitch renders only the surname, or the established compound shirt name (Vagner Love, Douglas Santos, etc.). Old saved drafts and multiplayer rooms use the same presentation helpers.

English names preserve the original Latin spelling and accents. Common Russian spellings have explicit overrides; other names use deterministic transliteration, not a claim of officially verified Russian spelling. Extend `footballNames.ts` when an authoritative spelling differs. New imports automatically have a Cyrillic display without editing historical snapshots. Custom aliases remain stored as entered.

History, squad statistics, season awards, result cards, favourite clubs, wheel, setup and admin roster tables share these helpers. User profile names are not passed through football name transliteration. Static UI strings are covered by a source scan regression test; player/club coverage tests exercise the supplied rosters, both source orders, accents and compound names.
