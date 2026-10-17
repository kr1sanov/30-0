import { db } from '@/lib/db';
import { archiveProgress } from './archiveProgress';
/** Five complete, playable seasons across at least two modes unlock 72 hours. */
export async function getArchiveAccess(userId: string | null, now = new Date()) {
  if (!userId) return archiveProgress([],now);
  const runs = await db.gameRun.findMany({ where: { userId, completed: true, wins: { not: null } },
    select: { gameMode:true,clubFilter:true,multiplayerRoomCode:true,completedAt:true,createdAt:true,
      multiplayerSeat:{select:{id:true}}, _count:{select:{slots:{where:{playerSeasonId:{not:null}}}}} } });
  return archiveProgress(runs.filter(r=>r._count.slots===11).map(r=>({ mode:r.multiplayerSeat||r.multiplayerRoomCode?'multiplayer':r.gameMode.startsWith('challenge_')?'challenge':r.clubFilter?'single_club':'classic',completedAt:r.completedAt??r.createdAt })),now);
}
