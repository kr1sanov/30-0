import { multiplayerUnavailable } from '@/lib/multiplayerAvailability';

export function POST() {
  return multiplayerUnavailable();
}
