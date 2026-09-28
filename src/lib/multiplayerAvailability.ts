import { NextResponse } from 'next/server';

// New rooms, old invite links and room controls are disabled together.
export function multiplayerUnavailable() {
  return NextResponse.json({ error: 'Режим мультиплеера временно недоступен' }, { status: 404 });
}
