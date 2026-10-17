import { db } from './db';
import { retentionDays } from './retention';
export async function ensureRetentionCampaigns() {
  for (const day of retentionDays) await db.notificationCampaign.upsert({
    where: { id: `return-default-${day}` }, update: {},
    create: {
      id: `return-default-${day}`, cadence: `return_${day}`, enabled: true,
      title: day === 3 ? 'Твой следующий состав ждёт ⚽' : day === 7 ? 'Новая неделя — новый драфт' : day === 10 ? 'Попробуешь другой клуб?' : 'Вернись на поле 30-0',
      message: day === 3 ? '{{name}}, собери новый состав и попробуй улучшить свой результат в 30-0.' : day === 7 ? '{{name}}, загляни в челленджи или собери команду в обычном драфте. Как далеко ты пройдёшь на этот раз?' : day === 10 ? '{{name}}, выбери любимый клуб, обычные или прайм-карточки и проверь состав против команд прошлого сезона.' : '{{name}}, давно не играли! Начни новый драфт или посмотри доступные челленджи.',
      titleEn: day === 3 ? 'Your next squad is waiting ⚽' : day === 7 ? 'New week, new draft' : day === 10 ? 'Try another club?' : 'Return to the pitch in 30-0',
      messageEn: day === 3 ? '{{name}}, draft a fresh squad and try to beat your best result in 30-0.' : day === 7 ? '{{name}}, explore the challenges or build a team in Classic Draft. How far can you go this time?' : day === 10 ? '{{name}}, choose a club, season or prime cards, and test your squad against a historical league.' : '{{name}}, it has been a while! Start a new draft or explore the available challenges.',
      buttonText: 'Играть', buttonTextEn: 'Play', buttonUrl: 'https://t.me/RPL30_bot?startapp',
    },
  });
}
