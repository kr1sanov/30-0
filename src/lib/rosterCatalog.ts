import type { Prisma } from '@prisma/client';
import { RosterImportError, type RosterRow } from './rosterImport';

type Catalog = Prisma.TransactionClient;

export async function saveRosterRows(tx: Catalog, seasonId: string, rows: RosterRow[], commit: boolean) {
  const season = await tx.season.findUnique({ where: { id: seasonId }, select: { id: true } });
  if (!season) throw new RosterImportError('Сначала выбери созданный сезон');
  const names = [...new Set(rows.map(row => row.clubName))];
  const fullNames = [...new Set(rows.map(row => row.fullName))];
  const ids = [...new Set(rows.flatMap(row => row.playerId ? [row.playerId] : []))];
  const [clubs, players, clubSeasons] = await Promise.all([
    tx.club.findMany({ where: { OR: [{ nameRu: { in: names } }, { nameEn: { in: names } }] } }),
    tx.player.findMany({ where: { OR: [{ fullName: { in: fullNames } }, { id: { in: ids } }] } }),
    tx.clubSeason.findMany({ where: { seasonId }, select: { id: true, clubId: true, players: { select: { playerId: true } } } }),
  ]);
  const resolvedClubs = new Map<string, string>();
  const resolvedPlayers = new Map<string, string>();
  const rosterPairs = new Set<string>();
  const existing = new Set(clubSeasons.flatMap(cs => cs.players.map(p => `${cs.clubId}:${p.playerId}`)));
  const clubSeasonIds = new Map(clubSeasons.map(cs => [cs.clubId, cs.id]));
  let newClubs = 0; let newPlayers = 0; let inserted = 0; let updated = 0;

  for (const row of rows) {
    let clubId = resolvedClubs.get(row.clubName);
    if (!clubId) {
      const matches = clubs.filter(club => club.nameRu === row.clubName || club.nameEn === row.clubName);
      if (matches.length > 1) throw new RosterImportError(`Строка ${row.line}: название клуба совпадает с несколькими командами`);
      if (matches[0]) clubId = matches[0].id;
      else {
        newClubs++;
        clubId = commit ? (await tx.club.create({ data: { nameRu: row.clubName, nameEn: row.clubNameEn } })).id : `new-club:${row.clubName}`;
      }
      resolvedClubs.set(row.clubName, clubId);
    }
    const identity = `${row.fullName}|${row.nationality || ''}|${row.birthYear || ''}`;
    let playerId = row.playerId || resolvedPlayers.get(identity);
    if (row.playerId) {
      const explicit = players.find(player => player.id === row.playerId);
      if (!explicit || explicit.fullName !== row.fullName) throw new RosterImportError(`Строка ${row.line}: ID не принадлежит игроку ${row.fullName}`);
    } else if (!playerId) {
      const matches = players.filter(player => player.fullName === row.fullName &&
        (!row.nationality || !player.nationality || player.nationality === row.nationality) &&
        (!row.birthYear || !player.birthYear || player.birthYear === row.birthYear));
      if (matches.length > 1) throw new RosterImportError(`Строка ${row.line}: несколько игроков с именем ${row.fullName}; укажи playerId`);
      if (matches[0]) playerId = matches[0].id;
      else {
        newPlayers++;
        playerId = commit ? (await tx.player.create({ data: {
          fullName: row.fullName, lastName: row.lastName, firstName: row.firstName,
          nationality: row.nationality, birthYear: row.birthYear,
        } })).id : `new-player:${identity}`;
      }
      resolvedPlayers.set(identity, playerId);
    }
    if (!playerId) throw new RosterImportError(`Строка ${row.line}: не удалось определить игрока`);
    const pair = `${clubId}:${playerId}`;
    if (rosterPairs.has(pair)) throw new RosterImportError(`Строка ${row.line}: один игрок повторяется в составе клуба`);
    rosterPairs.add(pair);
    if (existing.has(pair)) updated++; else inserted++;
    if (!commit) continue;
    let clubSeasonId = clubSeasonIds.get(clubId);
    if (!clubSeasonId) {
      clubSeasonId = (await tx.clubSeason.create({ data: { clubId, seasonId } })).id;
      clubSeasonIds.set(clubId, clubSeasonId);
    }
    await tx.playerSeason.upsert({
      where: { playerId_clubSeasonId: { playerId, clubSeasonId } },
      create: { playerId, clubSeasonId, rating: row.rating, primeRating: row.primeRating,
        mainPosition: row.mainPosition, otherPositions: row.otherPositions,
        nationality: row.nationality, sourceName: row.fullName, sourceUrl: row.sourceUrl },
      update: { rating: row.rating, primeRating: row.primeRating,
        mainPosition: row.mainPosition, otherPositions: row.otherPositions,
        ...(row.sourceUrl ? { sourceUrl: row.sourceUrl } : {}),
      },
    });
  }
  return { total: rows.length, clubs: resolvedClubs.size, newClubs, newPlayers, inserted, updated };
}
