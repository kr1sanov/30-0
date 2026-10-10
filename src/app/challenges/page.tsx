import type { Metadata } from 'next';
import ChallengesClient from './ChallengesClient';

export const metadata: Metadata = {
  title: 'Челленджи | 30-0',
  description: 'Новые футбольные задания каждую субботу в 12:00 МСК. Собери состав, сыграй сезон и открой достижения.',
};

export default function ChallengesPage() { return <ChallengesClient />; }
