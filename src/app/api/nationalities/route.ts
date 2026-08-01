import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// Flag emoji mapping for known nationalities
const NATIONALITY_FLAGS: Record<string, string> = {
  'Россия': '🇷🇺',
  'Бразилия': '🇧🇷',
  'Аргентина': '🇦🇷',
  'Сербия': '🇷🇸',
  'Хорватия': '🇭🇷',
  'Черногория': '🇲🇪',
  'Польша': '🇵🇱',
  'Украина': '🇺🇦',
  'Грузия': '🇬🇪',
  'Армения': '🇦🇲',
  'Азербайджан': '🇦🇿',
  'Казахстан': '🇰🇿',
  'Узбекистан': '🇺🇿',
  'Таджикистан': '🇹🇯',
  'Нигерия': '🇳🇬',
  'Камерун': '🇨🇲',
  'Гана': '🇬🇭',
  "Кот-д'Ивуар": '🇨🇮',
  'Конго': '🇨🇬',
  'Сенегал': '🇸🇳',
  'Ангола': '🇦🇴',
  'Марокко': '🇲🇦',
  'Швеция': '🇸🇪',
  'Нидерланды': '🇳🇱',
  'Франция': '🇫🇷',
  'Германия': '🇩🇪',
  'Испания': '🇪🇸',
  'Италия': '🇮🇹',
  'Португалия': '🇵🇹',
  'Бельгия': '🇧🇪',
  'Австрия': '🇦🇹',
  'Швейцария': '🇨🇭',
  'Чехия': '🇨🇿',
  'Словакия': '🇸🇰',
  'Словения': '🇸🇮',
  'Венгрия': '🇭🇺',
  'Румыния': '🇷🇴',
  'Болгария': '🇧🇬',
  'Литва': '🇱🇹',
  'Латвия': '🇱🇻',
  'Эстония': '🇪🇪',
  'Финляндия': '🇫🇮',
  'Норвегия': '🇳🇴',
  'Дания': '🇩🇰',
  'Исландия': '🇮🇸',
  'Босния': '🇧🇦',
  'Северная Македония': '🇲🇰',
  'Албания': '🇦🇱',
  'Турция': '🇹🇷',
  'Иран': '🇮🇷',
  'Корея': '🇰🇷',
  'Япония': '🇯🇵',
  'Китай': '🇨🇳',
  'Уругвай': '🇺🇾',
  'Парагвай': '🇵🇾',
  'Колумбия': '🇨🇴',
  'Чили': '🇨🇱',
  'Перу': '🇵🇪',
  'Эквадор': '🇪🇨',
  'Венесуэла': '🇻🇪',
  'Коста-Рика': '🇨🇷',
  'Мексика': '🇲🇽',
  'Ямайка': '🇯🇲',
};

export async function GET() {
  try {
    // Group players by nationality and count
    const players = await db.player.findMany({
      select: { nationality: true },
    });

    const nationalityCounts: Record<string, number> = {};
    for (const player of players) {
      const nat = player.nationality;
      if (!nat) continue;
      nationalityCounts[nat] = (nationalityCounts[nat] ?? 0) + 1;
    }

    // Filter to nationalities with at least 5 players
    const nationalities = Object.entries(nationalityCounts)
      .filter(([, count]) => count >= 5)
      .map(([nationality, playerCount]) => ({
        nationality,
        flag: NATIONALITY_FLAGS[nationality] ?? '🏳️',
        playerCount,
      }))
      .sort((a, b) => b.playerCount - a.playerCount);

    return NextResponse.json(nationalities);
  } catch (error) {
    console.error('Failed to fetch nationalities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nationalities' },
      { status: 500 },
    );
  }
}
