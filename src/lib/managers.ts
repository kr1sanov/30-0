/** First-team coaches with a tenure intersecting 2010–2018. */
export interface Manager {
  id: string;
  name: string;
  rating: number; // Game balance (1–10), not a sourced historical statistic.
  nationality: string;
  era: string;
  specialAbility?: string;
}

function coach(id: string, name: string, rating: number, nationality = 'Россия'): Manager {
  return { id, name, rating, nationality, era: '2010–2018' };
}

export const MANAGERS: Manager[] = [
  coach('syomin', 'Юрий Сёмин', 9),
  coach('berdyev', 'Курбан Бердыев', 9, 'Туркменистан'),
  coach('spalletti', 'Лучано Спаллетти', 9, 'Италия'),
  coach('lucescu', 'Мирча Луческу', 9, 'Румыния'),
  coach('semak', 'Сергей Семак', 9),
  coach('hiddink', 'Гус Хиддинк', 9, 'Нидерланды'),
  coach('slutsky', 'Леонид Слуцкий', 8),
  coach('carrera', 'Массимо Каррера', 8, 'Италия'),
  coach('mancini', 'Роберто Манчини', 8, 'Италия'),
  coach('karpin', 'Валерий Карпин', 7),
  coach('chertchesov', 'Станислав Черчесов', 7),
  coach('goncharenko', 'Виктор Гончаренко', 7, 'Беларусь'),
  coach('petresku', 'Дан Петреску', 7, 'Румыния'),
  coach('vilas-boas', 'Андре Виллаш-Боаш', 7, 'Португалия'),
  coach('bilyaletdinov', 'Ринат Билялетдинов', 7),
  coach('kobolev', 'Андрей Кобелев', 6),
  coach('shalimov', 'Игорь Шалимов', 6),
  coach('osinkin', 'Игорь Осинькин', 6),
  coach('bojovic', 'Миодраг Божович', 6, 'Черногория'),
  coach('kononov', 'Олег Кононов', 6, 'Беларусь'),
  coach('rahimov', 'Рашид Рахимов', 6, 'Таджикистан'),
  coach('gadzhiev', 'Гаджи Гаджиев', 6),
  coach('kuchuk', 'Леонид Кучук', 6, 'Беларусь'),
  coach('khokhlov', 'Дмитрий Хохлов', 5),
  coach('muslin', 'Славолюб Муслин', 6, 'Сербия'),
  coach('cherevchenko', 'Игорь Черевченко', 5, 'Таджикистан'),
  coach('tarkhanov', 'Александр Тарханов', 5),
  coach('grigoryan', 'Александр Григорян', 4),
  coach('vercauteren', 'Франк Веркаутерен', 5, 'Бельгия'),
  coach('evseev', 'Вадим Евсеев', 5),
  coach('musayev', 'Мурад Мусаев', 6),
  coach('krasnozhan', 'Юрий Красножан', 6),
  coach('maminov', 'Владимир Маминов', 5, 'Узбекистан'),
  coach('couceiro', 'Жозе Коусейру', 6, 'Португалия'),
  coach('bilic', 'Славен Билич', 6, 'Хорватия'),
  coach('pashinin', 'Олег Пашинин', 5, 'Узбекистан'),
  coach('vrba', 'Павел Врба', 6, 'Чехия'),
  coach('skripchenko', 'Вадим Скрипченко', 5, 'Беларусь'),
  coach('adiev', 'Магомед Адиев', 5),
  coach('tikhonov', 'Андрей Тихонов', 5),
  coach('riancho', 'Рауль Рианчо', 5, 'Испания'),
  coach('alenichev', 'Дмитрий Аленичев', 5),
  coach('yakin', 'Мурат Якин', 6, 'Швейцария'),
  coach('gunko', 'Дмитрий Гунько', 4),
  coach('emery', 'Унаи Эмери', 8, 'Испания'),
  coach('tashuev', 'Сергей Ташуев', 5),
  coach('munteanu', 'Доринел Мунтяну', 5, 'Румыния'),
  coach('galaktionov', 'Михаил Галактионов', 5),
  coach('ledyakhov', 'Игорь Ледяхов', 4),
  coach('gullit', 'Рууд Гуллит', 6, 'Нидерланды'),
  coach('baydachny', 'Анатолий Байдачный', 4),
  coach('gracia', 'Хави Грасия', 6, 'Испания'),
  coach('chaly', 'Валерий Чалый', 4),
  coach('protasov', 'Олег Протасов', 5, 'Украина'),
  coach('balakhnin', 'Сергей Балахнин', 4),
  coach('gamula', 'Игорь Гамула', 4, 'Украина'),
  coach('daniliants', 'Иван Данильянц', 5, 'Молдова'),
  coach('nepomnyashchiy', 'Валерий Непомнящий', 6),
  coach('perednya', 'Сергей Передня', 4),
  coach('davydov', 'Анатолий Давыдов', 5),
  coach('baskakov', 'Василий Баскаков', 4),
  coach('petrakov', 'Валерий Петраков', 5),
  coach('khuzin', 'Рустем Хузин', 4),
  coach('parfenov', 'Дмитрий Парфёнов', 5),
  coach('silkin', 'Сергей Силкин', 5),
  coach('kalitvintsev', 'Юрий Калитвинцев', 5, 'Украина'),
];

/**
 * FIFAIndex club source IDs in the 2010–2018 RPL registry.
 * Tenures and per-club sources: docs/research/rpl-managers-2010-2018.md
 */
export const CLUB_MANAGER_IDS: Record<string, readonly string[]> = {
  '100764': ['vercauteren', 'skripchenko', 'tikhonov', 'bojovic'],
  '100765': ['syomin', 'krasnozhan', 'maminov', 'couceiro', 'bilic', 'kuchuk', 'bojovic', 'cherevchenko', 'pashinin'],
  '100766': ['gadzhiev', 'hiddink', 'syomin', 'vrba', 'grigoryan', 'skripchenko', 'adiev'],
  '100767': ['karpin', 'emery', 'gunko', 'yakin', 'alenichev', 'carrera', 'riancho', 'kononov'],
  '100769': ['spalletti', 'semak', 'vilas-boas', 'lucescu', 'mancini'],
  '110089': ['petresku', 'osinkin', 'tashuev', 'khokhlov', 'kuchuk', 'goncharenko', 'munteanu', 'krasnozhan'],
  '110109': ['baydachny', 'gullit', 'chertchesov', 'krasnozhan', 'rahimov', 'kononov', 'galaktionov', 'ledyakhov'],
  '110227': ['berdyev', 'maminov', 'bilyaletdinov', 'chaly', 'gracia'],
  '110231': ['protasov', 'balakhnin', 'baydachny', 'bojovic', 'gamula', 'berdyev', 'daniliants', 'kuchuk', 'karpin'],
  '110233': ['nepomnyashchiy', 'perednya', 'davydov', 'baskakov', 'petrakov'],
  '110234': ['rahimov', 'bojovic', 'khuzin', 'chertchesov', 'muslin', 'gadzhiev', 'evseev'],
  '111264': ['tarkhanov', 'goncharenko', 'skripchenko', 'parfenov'],
  '112218': ['muslin', 'kononov', 'shalimov', 'musayev'],
  '312': ['kobolev', 'bojovic', 'silkin', 'khokhlov', 'petresku', 'chertchesov', 'kalitvintsev'],
  '315': ['slutsky', 'goncharenko'],
};

const managersById = new Map(MANAGERS.map(manager => [manager.id, manager]));

export function getManagersForClub(clubId: string | undefined): Manager[] {
  if (!clubId) return [];
  const sourceId = clubId.replace(/^fifaindex-club-/, '');
  return (CLUB_MANAGER_IDS[sourceId] ?? []).flatMap(id => {
    const manager = managersById.get(id);
    return manager ? [manager] : [];
  });
}

export function getRandomManager(clubId?: string): Manager | undefined {
  const pool = clubId ? getManagersForClub(clubId) : MANAGERS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getManagerById(id: string): Manager | undefined {
  return managersById.get(id);
}
