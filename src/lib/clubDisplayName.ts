// Explicit aliases cover every imported RPL club, including historical names.
const clubs: Array<[string, string, ...string[]]> = [
  ['ЦСКА','CSKA Moscow','CSKA Moskva','CSKA Moskou','ЦСКА Москва'],
  ['Динамо','Dynamo Moscow','Dinamo Moscow','Dinamo Moskva','Dinamo Moskou','Динамо Москва'],
  ['Спартак','Spartak Moscow','Spartak Moskva','Spartak Moskou','Спартак Москва'],
  ['Локомотив','Lokomotiv Moscow','Lokomotiv Moskva','Lokomotiv','Локомотив Москва'],
  ['Зенит','Zenit Saint Petersburg','Zenit','Zenit St. Petersburg','Zenit St Petersburg'],
  ['Крылья Советов','Krylya Sovetov Samara','Krylia Sovetov Samara','Krylya Sovetov'],
  ['Рубин','Rubin Kazan','Рубин Казань'], ['Ахмат','Akhmat Grozny','Ахмат Грозный'],
  ['Терек','Terek Grozny','Терек Грозный'], ['Анжи','Anzhi Makhachkala','Anji Makhachkala','A. Makhachkala','Анжи Махачкала'],
  ['Амкар','Amkar Perm','Амкар Пермь'], ['Томь','Tom Tomsk','Томь Томск'],
  ['Кубань','Kuban Krasnodar','Кубань Краснодар'], ['Урал','Ural Yekaterinburg','Ural Ekaterinburg','FC Ural'],
  ['Арсенал Тула','Arsenal Tula','Арсенал'], ['СКА-Хабаровск','SKA Khabarovsk'],
  ['Спартак-Нальчик','Spartak Nalchik'], ['Мордовия','Mordovia Saransk','Мордовия Саранск'],
  ['Сатурн','Saturn Ramenskoye','Сатурн Раменское'], ['Алания','Alania Vladikavkaz','Алания Владикавказ'],
  ['Сибирь','Sibir Novosibirsk','Сибирь Новосибирск'], ['Енисей','Yenisey Krasnoyarsk','Енисей Красноярск'],
  ['Шинник','Shinnik Yaroslavl','Шинник Ярославль'], ['Луч-Энергия','Luch-Energiya Vladivostok','Луч-Энергия Владивосток'],
  ['Пари НН','Pari Nizhny Novgorod','Nizhny Novgorod','Pari NN','Нижний Новгород'],
  ['Волга','Volga','Volga Nizhny Novgorod','FC Volga Nizhniy Novgorod','Волга Нижний Новгород'],
  ['Торпедо','Torpedo Moscow','Torpedo Moskva','Торпедо Москва'], ['Москва','FC Moscow','Moskva','Moscow','FC Moskva'],
  ['Краснодар','Krasnodar','FC Krasnodar'], ['Ростов','Rostov','FC Rostov'], ['Уфа','Ufa','FC Ufa'],
  ['Химки','Khimki','FC Khimki'], ['Оренбург','Orenburg','FC Orenburg'], ['Тосно','Tosno','FC Tosno'],
  ['Тамбов','Tambov'], ['Сочи','Sochi'], ['Балтика','Baltika Kaliningrad','Балтика Калининград'],
  ['Факел','Fakel Voronezh','Fakel','Факел Воронеж'], ['Акрон','Akron Togliatti','Akron','Акрон Тольятти'],
  ['Динамо Махачкала','Dynamo Makhachkala','Dinamo Makhachkala'], ['Родина','Rodina Moscow','Rodina Moskva','Rodina'],
];
const aliases = new Map(clubs.flatMap(([ru,en,...rest]) => [ru,en,...rest].map(name=>[name.trim().toLowerCase(),{ru,en}] as const)));
export function localizedClubName(name: string | null | undefined, language: 'ru' | 'en'): string {
  if (!name) return '';
  const normalized = name.trim().toLowerCase();
  const club = aliases.get(normalized) ?? aliases.get(normalized.replace(/^fc\s+/,''));
  return club?.[language] ?? name;
}
export function russianClubName(name: string): string { return localizedClubName(name,'ru'); }
