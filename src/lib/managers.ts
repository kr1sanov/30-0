// Russian football managers/coaches for the manager spin feature
export interface Manager {
  id: string;
  name: string;
  rating: number; // 1-10 scale
  nationality: string;
  era: string; // when they were active
  specialAbility?: string;
}

// Rating guidelines:
// 9-10: Champions League/Europa League winners, multiple RPL titles, legendary status
// 7-8: RPL title winners, consistent top-4 finishers, cup winners
// 5-6: Mid-table managers, solid professionals
// 3-4: Lower-table managers, limited success

export const MANAGERS: Manager[] = [
  // === LEGENDS (9-10) ===
  { id: 'gazzaev', name: 'Валерий Газзаев', rating: 9, nationality: 'Россия', era: '2000s', specialAbility: 'Атакующий стиль' },
  { id: 'romantsev', name: 'Олег Романцев', rating: 9, nationality: 'Россия', era: '2000s', specialAbility: 'Мотивация' },
  { id: 'syomin', name: 'Юрий Сёмин', rating: 9, nationality: 'Россия', era: '2000-2010s', specialAbility: 'Кубковый гений' },
  { id: 'berdyev', name: 'Курбан Бердыев', rating: 9, nationality: 'Туркменистан', era: '2000-2010s', specialAbility: 'Дисциплина' },
  { id: 'spalletti', name: 'Лучано Спаллетти', rating: 9, nationality: 'Италия', era: '2010s', specialAbility: 'Атака' },
  { id: 'luchesku', name: 'Мирча Луческу', rating: 9, nationality: 'Румыния', era: '2010s', specialAbility: 'Опыт' },
  { id: 'semak', name: 'Сергей Семак', rating: 9, nationality: 'Россия', era: '2010-2020s', specialAbility: 'Сбалансированность' },
  { id: 'hiddink', name: 'Гус Хиддинк', rating: 9, nationality: 'Нидерланды', era: '2010s', specialAbility: 'Тактик' },
  { id: 'advocaat', name: 'Дик Адвокат', rating: 9, nationality: 'Нидерланды', era: '2000s', specialAbility: 'Мотивация' },

  // === ELITE (7-8) ===
  { id: 'slutsky', name: 'Леонид Слуцкий', rating: 8, nationality: 'Россия', era: '2010s', specialAbility: 'Тактик' },
  { id: 'carrera', name: 'Массимо Каррера', rating: 8, nationality: 'Италия', era: '2010s', specialAbility: 'Оборона' },
  { id: 'capello', name: 'Фабио Капелло', rating: 8, nationality: 'Италия', era: '2010s', specialAbility: 'Оборона' },
  { id: 'mancini', name: 'Роберто Манчини', rating: 8, nationality: 'Италия', era: '2010s', specialAbility: 'Стратег' },
  { id: 'karpin', name: 'Валерий Карпин', rating: 7, nationality: 'Россия', era: '2010-2020s', specialAbility: 'Боевой характер' },
  { id: 'chertchesov', name: 'Станислав Черчесов', rating: 7, nationality: 'Россия', era: '2000-2010s', specialAbility: 'Дисциплина' },
  { id: 'goncharenko', name: 'Виктор Гончаренко', rating: 7, nationality: 'Беларусь', era: '2010-2020s', specialAbility: 'Аналитик' },
  { id: 'musayev', name: 'Мурад Муссаев', rating: 7, nationality: 'Россия', era: '2020s', specialAbility: 'Молодёжь' },
  { id: 'fedotov', name: 'Владимир Федотов', rating: 7, nationality: 'Россия', era: '2020s', specialAbility: 'Стабильность' },
  { id: 'nikolic', name: 'Марко Николич', rating: 7, nationality: 'Сербия', era: '2020s', specialAbility: 'Организация' },
  { id: 'petresku', name: 'Дан Петреску', rating: 7, nationality: 'Румыния', era: '2010s', specialAbility: 'Боевой характер' },
  { id: 'byshovets', name: 'Анатолий Бышовец', rating: 7, nationality: 'Россия', era: '2000s' },
  { id: 'vilas-boas', name: 'Андре Виллаш-Боаш', rating: 7, nationality: 'Португалия', era: '2010s', specialAbility: 'Атака' },
  { id: 'tedesco', name: 'Доменико Тедеско', rating: 7, nationality: 'Германия', era: '2020s', specialAbility: 'Прессинг' },
  { id: 'bilyaletdinov', name: 'Ринат Билялетдинов', rating: 7, nationality: 'Россия', era: '2010s', specialAbility: 'Оборона' },
  { id: 'stankovic', name: 'Деян Станкович', rating: 7, nationality: 'Сербия', era: '2020s', specialAbility: 'Воля к победе' },

  // === SOLID (5-6) ===
  { id: 'kobolev', name: 'Андрей Кобелев', rating: 6, nationality: 'Россия', era: '2000-2010s' },
  { id: 'shalimov', name: 'Игорь Шалимов', rating: 6, nationality: 'Россия', era: '2010-2020s' },
  { id: 'osinkin', name: 'Игорь Осинькин', rating: 6, nationality: 'Россия', era: '2020s' },
  { id: 'bojovic', name: 'Миодраг Божович', rating: 6, nationality: 'Черногория', era: '2010-2020s' },
  { id: 'kononov', name: 'Олег Кононов', rating: 6, nationality: 'Беларусь', era: '2010s' },
  { id: 'rahimov', name: 'Рашид Рахимов', rating: 6, nationality: 'Россия', era: '2000-2020s' },
  { id: 'yartsev', name: 'Александр Ярцев', rating: 6, nationality: 'Россия', era: '2000s' },
  { id: 'gadzhiev', name: 'Гаджи Гаджиев', rating: 6, nationality: 'Россия', era: '2000-2010s' },
  { id: 'kuchuk', name: 'Леонид Кучук', rating: 6, nationality: 'Украина', era: '2010s' },
  { id: 'berezutski', name: 'Алексей Березуцкий', rating: 5, nationality: 'Россия', era: '2020s' },
  { id: 'abascal', name: 'Гильермо Абаскаль', rating: 5, nationality: 'Испания', era: '2020s' },
  { id: 'vitoria', name: 'Руй Витория', rating: 6, nationality: 'Португалия', era: '2020s' },
  { id: 'liczka', name: 'Марцель Личка', rating: 6, nationality: 'Чехия', era: '2020s' },
  { id: 'khokhlov', name: 'Дмитрий Хохлов', rating: 5, nationality: 'Россия', era: '2010s' },
  { id: 'muslin', name: 'Славолюб Муслин', rating: 6, nationality: 'Сербия', era: '2010s' },
  { id: 'cherevchenko', name: 'Игорь Черевченко', rating: 5, nationality: 'Россия', era: '2010s' },
  { id: 'ivich', name: 'Владимир Ивич', rating: 6, nationality: 'Сербия', era: '2020s' },
  { id: 'talalaev', name: 'Андрей Талалаев', rating: 5, nationality: 'Россия', era: '2020s' },
  { id: 'farke', name: 'Даниэль Фарке', rating: 5, nationality: 'Германия', era: '2020s' },
  { id: 'schwarts', name: 'Сандор Шварц', rating: 5, nationality: 'Венгрия', era: '2020s' },
  { id: 'jokanovic', name: 'Славиша Йоканович', rating: 5, nationality: 'Сербия', era: '2020s' },
  { id: 'galitsky', name: 'Михаил Галкин', rating: 5, nationality: 'Россия', era: '2020s' },
  { id: 'starkov', name: 'Александр Старков', rating: 5, nationality: 'Россия', era: '2000s' },
  { id: 'laudrup', name: 'Микаэль Лаудруп', rating: 5, nationality: 'Дания', era: '2000s' },
  { id: 'prokopenko', name: 'Виктор Прокопенко', rating: 5, nationality: 'Украина', era: '2000s' },
  { id: 'zico', name: 'Зико', rating: 5, nationality: 'Бразилия', era: '2000s' },
  { id: 'kalechnik', name: 'Виктор Кале', rating: 5, nationality: 'Россия', era: '2000s' },
  { id: 'vercauteren', name: 'Франк Веркаутерен', rating: 5, nationality: 'Бельгия', era: '2010s' },
  { id: 'rober', name: 'Юрген Рёбер', rating: 5, nationality: 'Германия', era: '2000s' },
  { id: 'scala', name: 'Невио Скала', rating: 5, nationality: 'Италия', era: '2000s' },

  // === LOWER TABLE (3-4) ===
  { id: 'tarkhanov', name: 'Александр Тарханов', rating: 4, nationality: 'Россия', era: '2000s' },
  { id: 'ivanov', name: 'Александр Иванов', rating: 4, nationality: 'Россия', era: '2000s' },
  { id: 'pobegalov', name: 'Александр Побегалов', rating: 4, nationality: 'Россия', era: '2000-2010s' },
  { id: 'grigoryan', name: 'Александр Григорян', rating: 4, nationality: 'Россия', era: '2010-2020s' },
  { id: 'evdokimov', name: 'Роберт Евдокимов', rating: 4, nationality: 'Россия', era: '2010-2020s' },
  { id: 'pavlov', name: 'Сергей Павлов', rating: 4, nationality: 'Россия', era: '2000s' },
  { id: 'baydachny', name: 'Анатолий Байдачный', rating: 4, nationality: 'Россия', era: '2000s' },
  { id: 'gromov', name: 'Вячеслав Грозный', rating: 4, nationality: 'Россия', era: '2000-2010s' },
  { id: 'shevchuk', name: 'Владимир Шевчук', rating: 3, nationality: 'Россия', era: '2000s' },
  { id: 'astyashev', name: 'Михаил Асташёв', rating: 3, nationality: 'Россия', era: '2000-2010s' },
];

export function getRandomManager(): Manager {
  return MANAGERS[Math.floor(Math.random() * MANAGERS.length)];
}

export function getManagerById(id: string): Manager | undefined {
  return MANAGERS.find((m) => m.id === id);
}
