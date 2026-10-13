const aliases: Record<string, string> = {
  "cska moscow": "ЦСКА",
  "dynamo moscow": "Динамо",
  "dinamo moscow": "Динамо",
  "spartak moscow": "Спартак",
  "lokomotiv moscow": "Локомотив",
  "zenit saint petersburg": "Зенит",
  "zenit st. petersburg": "Зенит",
  "zenit st petersburg": "Зенит",
  "krylya sovetov samara": "Крылья Советов",
  "krylia sovetov samara": "Крылья Советов",
  "rubin kazan": "Рубин",
  "akhmat grozny": "Ахмат",
  "terek grozny": "Терек",
  "anzhi makhachkala": "Анжи",
  "amkar perm": "Амкар",
  "tom tomsk": "Томь",
  "kuban krasnodar": "Кубань",
  "ural ekaterinburg": "Урал",
  "arsenal tula": "Арсенал Тула",
  "ska khabarovsk": "СКА-Хабаровск",
  "spartak nalchik": "Спартак-Нальчик",
  "mordovia saransk": "Мордовия",
  "saturn ramenskoye": "Сатурн",
  "alania vladikavkaz": "Алания",
  "sibir novosibirsk": "Сибирь",
  "yenisey krasnoyarsk": "Енисей",
  "shinnik yaroslavl": "Шинник",
  "luch-energiya vladivostok": "Луч-Энергия",
  "nizhny novgorod": "Пари НН",
  "pari nn": "Пари НН",
  volga: "Волга",
  "torpedo moskva": "Торпедо",
  "torpedo moscow": "Торпедо",
  moskva: "Москва",
  moscow: "Москва",
  krasnodar: "Краснодар",
  rostov: "Ростов",
  ufa: "Уфа",
  khimki: "Химки",
  orenburg: "Оренбург",
  tosno: "Тосно",
  tambov: "Тамбов",
  sochi: "Сочи",
};
/** Database/import aliases share one Russian source label; names outside RPL remain intact. */
export function russianClubName(name: string): string {
  return (
    aliases[
      name
        .trim()
        .toLowerCase()
        .replace(/^fc\s+/, "")
    ] ?? name
  );
}
