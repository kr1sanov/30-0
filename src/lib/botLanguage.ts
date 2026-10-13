export type BotLanguage = 'ru' | 'en';
/** Translate automatic messages without touching player names or authored campaign copy. */
export function localizeBotMessage(text: string, language: BotLanguage) {
  if (language === 'en') return text;
  return text
    .replace('Your friend request was accepted.', 'Твою заявку в друзья приняли. Открой профиль и приглашай в игру!')
    .replace(' sent you a friend request.', ' хочет добавить тебя в друзья. Познакомьтесь и сравните свои составы!')
    .replace(' invites you to play 30-0.', ' приглашает тебя сыграть в 30-0. Собери команду и покажи, чей состав сильнее!')
    .replace('Season complete! ⚽', 'Сезон завершён! ⚽')
    .replace(/(\d+) wins · (\d+) draws · (\d+) losses/g, '$1 побед · $2 ничьих · $3 поражений')
    .replace(/(\d+) points · Place (\d+|—)/g, '$1 очков · Место $2')
    .replace('Can you beat your score?', 'Сможешь улучшить результат? Новый состав — новая попытка сделать 30-0!');
}
export function localizeBotButton(text: string, language: BotLanguage) {
  if (language === 'en') return text;
  return ({ 'Open 30-0': 'Открыть 30-0', 'View season result': 'Посмотреть результат', 'Play': 'Играть' } as Record<string, string>)[text] ?? text;
}
