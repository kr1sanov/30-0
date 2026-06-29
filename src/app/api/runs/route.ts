import { db } from '@/lib/db';
import { FORMATIONS } from '@/lib/positions';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { formation, difficulty, draftMode, ratingMode, eraFilter } = body;

    // Validate formation exists
    const formationData = FORMATIONS.find((f) => f.id === formation);
    if (!formationData) {
      return NextResponse.json(
        { error: 'Invalid formation' },
        { status: 400 },
      );
    }

    // Determine rerolls based on difficulty
    const rerollsMap: Record<string, number> = {
      easy: 3,
      normal: 1,
      hard: 0,
    };
    const rerollsTotal = rerollsMap[difficulty] ?? 1;

    // Create the game run
    const run = await db.gameRun.create({
      data: {
        formation: formation || '4-3-3',
        difficulty: difficulty || 'normal',
        draftMode: draftMode || 'squad_first',
        ratingMode: ratingMode || 'season',
        eraFilter: eraFilter || 'all',
        rerollsTotal,
        rerollsUsed: 0,
        completed: false,
      },
    });

    // Create 11 game slots from the formation
    const slotsData = formationData.slots.map((slot, index) => ({
      runId: run.id,
      slotPosition: `${slot.position}_${index}`,
      isCompatible: true,
    }));

    await db.gameSlot.createMany({ data: slotsData });

    // Return the run with slots
    const runWithSlots = await db.gameRun.findUnique({
      where: { id: run.id },
      include: { slots: true },
    });

    return NextResponse.json(runWithSlots, { status: 201 });
  } catch (error) {
    console.error('Failed to create game run:', error);
    return NextResponse.json(
      { error: 'Failed to create game run' },
      { status: 500 },
    );
  }
}
