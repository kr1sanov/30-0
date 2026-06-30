// Russian football managers/coaches for the manager spin feature
export interface Manager {
  id: string;
  name: string;
  rating: number;
  nationality: string;
  era: string; // when they were active
  specialAbility?: string;
}

export const MANAGERS: Manager[] = [
  // Legends
  { id: 'gazzaev', name: 'Валерий Газзаев', rating: 88, nationality: 'Россия', era: '1990-2000s', specialAbility: 'Атакующий стиль' },
  { id: 'romantsev', name: 'Олег Романцев', rating: 87, nationality: 'Россия', era: '1990-2000s', specialAbility: 'Мотивация' },
  { id: 'syomin', name: 'Юрий Сёмин', rating: 86, nationality: 'Россия', era: '1990-2010s', specialAbility: 'Опыт' },
  { id: 'byshovets', name: 'Анатолий Бышовец', rating: 82, nationality: 'Россия', era: '1990-2000s' },
  
  // CSKA era
  { id: 'slutsky', name: 'Леонид Слуцкий', rating: 85, nationality: 'Россия', era: '2010s', specialAbility: 'Тактик' },
  { id: 'carrera', name: 'Массимо Каррера', rating: 86, nationality: 'Италия', era: '2010s', specialAbility: 'Оборона' },
  
  // Zenit era
  { id: 'spalletti', name: 'Лучано Спаллетти', rating: 88, nationality: 'Италия', era: '2010s', specialAbility: 'Атака' },
  { id: 'luchesku', name: 'Мирча Луческу', rating: 89, nationality: 'Румыния', era: '2010-2020s', specialAbility: 'Опыт' },
  { id: 'semak', name: 'Сергей Семак', rating: 86, nationality: 'Россия', era: '2010-2020s', specialAbility: 'Сбалансированность' },
  
  // Spartak
  { id: 'chertchesov', name: 'Станислав Черчесов', rating: 84, nationality: 'Россия', era: '2010-2020s' },
  { id: 'karpin', name: 'Валерий Карпин', rating: 83, nationality: 'Россия', era: '2010-2020s' },
  { id: 'abascal', name: 'Гильермо Абаскаль', rating: 80, nationality: 'Испания', era: '2020s' },
  
  // Lokomotiv
  { id: 'gadzhiev', name: 'Юрий Гаджиев', rating: 81, nationality: 'Россия', era: '2010s' },
  { id: 'yinikhmetov', name: 'Марко Николич', rating: 82, nationality: 'Сербия', era: '2020s' },
  
  // Krasnodar
  { id: 'galitsky', name: 'Мурад Муссаев', rating: 82, nationality: 'Россия', era: '2020s', specialAbility: 'Молодёжь' },
  { id: 'shpilev', name: 'Даниэль Фарке', rating: 81, nationality: 'Германия', era: '2020s' },
  
  // Rubin
  { id: 'berdyev', name: 'Курбан Бердыев', rating: 85, nationality: 'Туркменистан', era: '2000-2010s', specialAbility: 'Дисциплина' },
  
  // Rostov
  { id: 'karpin2', name: 'Валерий Карпин', rating: 83, nationality: 'Россия', era: '2020s' },
  
  // International stars
  { id: 'advocaat', name: 'Дик Адвокат', rating: 87, nationality: 'Нидерланды', era: '2000-2010s', specialAbility: 'Мотивация' },
  { id: 'hiddink', name: 'Гус Хиддинк', rating: 89, nationality: 'Нидерланды', era: '2000s', specialAbility: 'Тактик' },
  { id: 'capello', name: 'Фабио Капелло', rating: 88, nationality: 'Италия', era: '2010s', specialAbility: 'Оборона' },
  { id: 'mancini', name: 'Роберто Манчини', rating: 87, nationality: 'Италия', era: '2020s' },
];

export function getRandomManager(): Manager {
  return MANAGERS[Math.floor(Math.random() * MANAGERS.length)];
}

export function getManagerById(id: string): Manager | undefined {
  return MANAGERS.find((m) => m.id === id);
}
