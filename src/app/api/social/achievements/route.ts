import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessionUser } from '@/lib/telegramSession';

export async function GET(request: Request) {
  const userId = sessionUser(request);
  if (!userId) return NextResponse.json({ ids: [] });
  const [clubs, seats] = await Promise.all([
    db.gameRun.findMany({ where: { userId, gameMode: 'single_club', completed: true }, select: { position: true, losses: true, goalsFor: true, wins: true, clubFilter: true } }),
    db.multiplayerSeat.findMany({ where: { userId, run: { completed: true } }, include: { run: { select: { position: true, losses: true, wins: true } }, room: { select: { seats: { select: { isBot: true, userId: true } } } } } }),
  ]);
  const ids: string[] = [];
  const earned = (condition: boolean, id: string) => { if (condition) ids.push(id); };
  earned(clubs.some(run => run.position === 1), 'club_crown');
  earned(clubs.some(run => run.position === 1 && run.losses === 0), 'club_unbeaten');
  earned(clubs.some(run => run.position === 1 && (run.goalsFor ?? 0) >= 60), 'club_attack');
  earned(new Set(clubs.filter(run => run.position === 1).map(run => run.clubFilter).filter(Boolean)).size >= 3, 'club_collector');
  const human = seats.filter(seat => seat.room.seats.some(opponent => !opponent.isBot && opponent.userId !== userId));
  earned(human.some(seat => seat.run?.position === 1), 'duel_winner');
  earned(human.some(seat => seat.run?.position === 1 && seat.run?.losses === 0), 'duel_unbeaten');
  earned(human.filter(seat => seat.run?.position === 1).length >= 3, 'duel_hat_trick');
  return NextResponse.json({ ids });
}
