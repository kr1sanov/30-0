import { db } from '@/lib/db';
import { sessionUser, sameOrigin } from '@/lib/telegramSession';
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const userId = sessionUser(request);
  if (!userId) return new Response(null, { status: 401 });
  const code = (await params).code.toUpperCase();
  await db.$transaction(async tx => {
    await tx.multiplayerSeat.updateMany({ where: { roomCode: code, userId, room: { status: 'lobby' } }, data: { ready: false, lastSeenAt: null } });
    await tx.multiplayerRoom.updateMany({ where: { code, status: 'lobby', seats: { some: { userId } } }, data: { draftStartAt: null } });
  });
  return Response.json({ ok: true });
}
