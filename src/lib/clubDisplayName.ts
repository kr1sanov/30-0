// Explicit aliases cover every imported RPL club, including historical names.
const clubs: Array<[string, string, ...string[]]> = [
  ['ПФК ЦСКА','CSKA Moscow','ЦСКА','CSKA Moskva','CSKA Moskou','ЦСКА Москва'],
  ['Динамо Москва','Dynamo Moscow','Динамо','Dinamo Moscow','Dinamo Moskva','Dinamo Moskou','Динамо Москва'],
  ['Спартак Москва','Spartak Moscow','Спартак','Spartak Moskva','Spartak Moskou','Спартак Москва'],
  ['Локомотив Москва','Lokomotiv Moscow','Локомотив','Lokomotiv Moskva','Lokomotiv','Локомотив Москва'],
  ['Зенит Санкт-Петербург','Zenit Saint Petersburg','Зенит','Zenit','Zenit St. Petersburg','Zenit St Petersburg'],
  ['Крылья Советов Самара','Krylya Sovetov Samara','Крылья Советов','Krylia Sovetov Samara','Krylya Sovetov'],
  ['Рубин Казань','Rubin Kazan','Рубин','Рубин Казань'], ['Ахмат Грозный','Akhmat Grozny','Ахмат','Ахмат Грозный'],
  ['Терек Грозный','Terek Grozny','Терек','Терек Грозный'], ['Анжи Махачкала','Anzhi Makhachkala','Анжи','Anji Makhachkala','A. Makhachkala','Анжи Махачкала'],
  ['Амкар Пермь','Amkar Perm','Амкар','Амкар Пермь'], ['Томь Томск','Tom Tomsk','Томь','Томь Томск'],
  ['Кубань Краснодар','Kuban Krasnodar','Кубань','Кубань Краснодар'], ['Урал Екатеринбург','Ural Yekaterinburg','Урал','Ural Ekaterinburg','FC Ural'],
  ['Арсенал Тула','Arsenal Tula','Арсенал'], ['СКА-Хабаровск','SKA Khabarovsk'],
  ['Спартак-Нальчик','Spartak Nalchik'], ['Мордовия Саранск','Mordovia Saransk','Мордовия','Мордовия Саранск'],
  ['Сатурн Раменское','Saturn Ramenskoye','Сатурн','Сатурн Раменское'], ['Алания Владикавказ','Alania Vladikavkaz','Алания','Алания Владикавказ'],
  ['Сибирь Новосибирск','Sibir Novosibirsk','Сибирь','Сибирь Новосибирск'], ['Енисей Красноярск','Yenisey Krasnoyarsk','Енисей','Енисей Красноярск'],
  ['Шинник Ярославль','Shinnik Yaroslavl','Шинник','Шинник Ярославль'], ['Луч-Энергия Владивосток','Luch-Energiya Vladivostok','Луч-Энергия','Луч-Энергия Владивосток'],
  ['Пари НН','Pari Nizhny Novgorod','Nizhny Novgorod','Pari NN','Нижний Новгород'],
  ['Волга','Volga','Volga Nizhny Novgorod','FC Volga Nizhniy Novgorod','Волга Нижний Новгород'],
  ['Торпедо Москва','Torpedo Moscow','Торпедо','Torpedo Moskva','Торпедо Москва'], ['Москва','FC Moscow','Moskva','Moscow','FC Moskva'],
  ['Краснодар','Krasnodar','FC Krasnodar'], ['Ростов','Rostov','FC Rostov'], ['Уфа','Ufa','FC Ufa'],
  ['Химки','Khimki','FC Khimki'], ['Оренбург','Orenburg','FC Orenburg'], ['Тосно','Tosno','FC Tosno'],
  ['Тамбов','Tambov'], ['Сочи','Sochi'], ['Балтика Калининград','Baltika Kaliningrad','Балтика','Балтика Калининград'],
  ['Факел Воронеж','Fakel Voronezh','Факел','Fakel','Факел Воронеж'], ['Акрон Тольятти','Akron Togliatti','Акрон','Akron','Акрон Тольятти'],
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
