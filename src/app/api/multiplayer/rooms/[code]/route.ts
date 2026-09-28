import { multiplayerUnavailable } from '@/lib/multiplayerAvailability';

export function GET() {
  return multiplayerUnavailable();
}

export function PATCH() {
  return multiplayerUnavailable();
}
