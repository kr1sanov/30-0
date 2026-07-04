// ============================================================================
// 30-0 RPL — Nationality to Flag Emoji Mapping
// ============================================================================

/**
 * Maps Russian nationality names to country flag emojis.
 * Uses Unicode regional indicator symbols.
 */
const NATIONALITY_FLAGS: Record<string, string> = {
  // Common nationalities in RPL (Russian names)
  'Россия': '🇷🇺',
  'Украина': '🇺🇦',
  'Беларусь': '🇧🇾',
  'Казахстан': '🇰🇿',
  'Узбекистан': '🇺🇿',
  'Грузия': '🇬🇪',
  'Армения': '🇦🇲',
  'Азербайджан': '🇦🇿',
  'Молдова': '🇲🇩',
  'Латвия': '🇱🇻',
  'Литва': '🇱🇹',
  'Эстония': '🇪🇪',
  'Кыргызстан': '🇰🇬',
  'Таджикистан': '🇹🇯',
  'Туркменистан': '🇹🇲',

  // European
  'Сербия': '🇷🇸',
  'Хорватия': '🇭🇷',
  'Босния': '🇧🇦',
  'Черногория': '🇲🇪',
  'Словения': '🇸🇮',
  'Македония': '🇲🇰',
  'Албания': '🇦🇱',
  'Польша': '🇵🇱',
  'Чехия': '🇨🇿',
  'Словакия': '🇸🇰',
  'Венгрия': '🇭🇺',
  'Румыния': '🇷🇴',
  'Болгария': '🇧🇬',
  'Греция': '🇬🇷',
  'Турция': '🇹🇷',
  'Австрия': '🇦🇹',
  'Швейцария': '🇨🇭',
  'Германия': '🇩🇪',
  'Франция': '🇫🇷',
  'Испания': '🇪🇸',
  'Италия': '🇮🇹',
  'Португалия': '🇵🇹',
  'Нидерланды': '🇳🇱',
  'Бельгия': '🇧🇪',
  'Дания': '🇩🇰',
  'Швеция': '🇸🇪',
  'Норвегия': '🇳🇴',
  'Финляндия': '🇫🇮',
  'Исландия': '🇮🇸',
  'Ирландия': '🇮🇪',
  'Англия': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Шотландия': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Уэльс': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',

  // South America
  'Бразилия': '🇧🇷',
  'Аргентина': '🇦🇷',
  'Уругвай': '🇺🇾',
  'Парагвай': '🇵🇾',
  'Чили': '🇨🇱',
  'Колумбия': '🇨🇴',
  'Эквадор': '🇪🇨',
  'Перу': '🇵🇪',
  'Венесуэла': '🇻🇪',
  'Боливия': '🇧🇴',

  // Africa
  'Нигерия': '🇳🇬',
  'Камерун': '🇨🇲',
  'Гана': '🇬🇭',
  'Кот-д\'Ивуар': '🇨🇮',
  'Сенегал': '🇸🇳',
  'Мали': '🇲🇱',
  'Гвинея': '🇬🇳',
  'Конго': '🇨🇬',
  'Буркина-Фасо': '🇧🇫',
  'Ангола': '🇦🇴',
  'Марокко': '🇲🇦',
  'Тунис': '🇹🇳',
  'Египет': '🇪🇬',
  'ЮАР': '🇿🇦',
  'Кабо-Верде': '🇨🇻',

  // Asia
  'Япония': '🇯🇵',
  'Южная Корея': '🇰🇷',
  'Китай': '🇨🇳',
  'Иран': '🇮🇷',
  'Ирак': '🇮🇶',
  'Саудовская Аравия': '🇸🇦',
  'Израиль': '🇮🇱',

  // North/Central America
  'США': '🇺🇸',
  'Мексика': '🇲🇽',
  'Коста-Рика': '🇨🇷',
  'Ямайка': '🇯🇲',

  // Oceania
  'Австралия': '🇦🇺',
  'Новая Зеландия': '🇳🇿',

  // ── English nationality names (in case DB uses them) ──
  'Russian': '🇷🇺',
  'Ukrainian': '🇺🇦',
  'Belarusian': '🇧🇾',
  'Kazakh': '🇰🇿',
  'Uzbek': '🇺🇿',
  'Georgian': '🇬🇪',
  'Armenian': '🇦🇲',
  'Azerbaijani': '🇦🇿',
  'Moldovan': '🇲🇩',
  'Latvian': '🇱🇻',
  'Lithuanian': '🇱🇹',
  'Estonian': '🇪🇪',

  'Serbian': '🇷🇸',
  'Croatian': '🇭🇷',
  'Bosnian': '🇧🇦',
  'Montenegrin': '🇲🇪',
  'Slovenian': '🇸🇮',
  'Macedonian': '🇲🇰',
  'Albanian': '🇦🇱',
  'Polish': '🇵🇱',
  'Czech': '🇨🇿',
  'Slovak': '🇸🇰',
  'Hungarian': '🇭🇺',
  'Romanian': '🇷🇴',
  'Bulgarian': '🇧🇬',
  'Greek': '🇬🇷',
  'Turkish': '🇹🇷',
  'Austrian': '🇦🇹',
  'Swiss': '🇨🇭',
  'German': '🇩🇪',
  'French': '🇫🇷',
  'Spanish': '🇪🇸',
  'Italian': '🇮🇹',
  'Portuguese': '🇵🇹',
  'Dutch': '🇳🇱',
  'Belgian': '🇧🇪',
  'Danish': '🇩🇰',
  'Swedish': '🇸🇪',
  'Norwegian': '🇳🇴',
  'Finnish': '🇫🇮',
  'Icelandic': '🇮🇸',
  'Irish': '🇮🇪',
  'English': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Scottish': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Welsh': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',

  'Brazilian': '🇧🇷',
  'Argentine': '🇦🇷',
  'Argentinian': '🇦🇷',
  'Uruguayan': '🇺🇾',
  'Paraguayan': '🇵🇾',
  'Chilean': '🇨🇱',
  'Colombian': '🇨🇴',
  'Ecuadorian': '🇪🇨',
  'Peruvian': '🇵🇪',
  'Venezuelan': '🇻🇪',
  'Bolivian': '🇧🇴',

  'Nigerian': '🇳🇬',
  'Cameroonian': '🇨🇲',
  'Ghanaian': '🇬🇭',
  'Ivorian': '🇨🇮',
  'Senegalese': '🇸🇳',
  'Malian': '🇲🇱',
  'Guinean': '🇬🇳',
  'Congolese': '🇨🇬',
  'Angolan': '🇦🇴',
  'Moroccan': '🇲🇦',
  'Tunisian': '🇹🇳',
  'Egyptian': '🇪🇬',
  'South African': '🇿🇦',

  'Japanese': '🇯🇵',
  'South Korean': '🇰🇷',
  'Chinese': '🇨🇳',
  'Iranian': '🇮🇷',
  'Iraqi': '🇮🇶',
  'Saudi': '🇸🇦',
  'Israeli': '🇮🇱',

  'American': '🇺🇸',
  'Mexican': '🇲🇽',
  'Costa Rican': '🇨🇷',
  'Jamaican': '🇯🇲',

  'Australian': '🇦🇺',
  'New Zealander': '🇳🇿',

  // ── Common 2-letter country codes (ISO 3166-1 alpha-2) ──
  'RU': '🇷🇺',
  'UA': '🇺🇦',
  'BY': '🇧🇾',
  'KZ': '🇰🇿',
  'UZ': '🇺🇿',
  'GE': '🇬🇪',
  'AM': '🇦🇲',
  'AZ': '🇦🇿',
  'MD': '🇲🇩',
  'LV': '🇱🇻',
  'LT': '🇱🇹',
  'EE': '🇪🇪',
  'RS': '🇷🇸',
  'HR': '🇭🇷',
  'BA': '🇧🇦',
  'ME': '🇲🇪',
  'SI': '🇸🇮',
  'PL': '🇵🇱',
  'CZ': '🇨🇿',
  'SK': '🇸🇰',
  'HU': '🇭🇺',
  'RO': '🇷🇴',
  'BG': '🇧🇬',
  'GR': '🇬🇷',
  'TR': '🇹🇷',
  'AT': '🇦🇹',
  'CH': '🇨🇭',
  'DE': '🇩🇪',
  'FR': '🇫🇷',
  'ES': '🇪🇸',
  'IT': '🇮🇹',
  'PT': '🇵🇹',
  'NL': '🇳🇱',
  'BE': '🇧🇪',
  'DK': '🇩🇰',
  'SE': '🇸🇪',
  'NO': '🇳🇴',
  'FI': '🇫🇮',
  'BR': '🇧🇷',
  'AR': '🇦🇷',
  'UY': '🇺🇾',
  'CL': '🇨🇱',
  'CO': '🇨🇴',
  'JP': '🇯🇵',
  'KR': '🇰🇷',
  'CN': '🇨🇳',
  'IR': '🇮🇷',
  'US': '🇺🇸',
  'MX': '🇲🇽',
  'AU': '🇦🇺',
  'NZ': '🇳🇿',
  'NG': '🇳🇬',
  'CM': '🇨🇲',
  'GH': '🇬🇭',
  'MA': '🇲🇦',
  'TN': '🇹🇳',
  'EG': '🇪🇬',
  'ZA': '🇿🇦',
};

/**
 * Returns the flag emoji for a given Russian nationality name.
 * Returns empty string if the nationality is not found.
 */
export function getNationalityFlag(nationality?: string | null): string {
  if (!nationality) return '';
  // Try direct lookup first
  const direct = NATIONALITY_FLAGS[nationality];
  if (direct) return direct;
  // Try case-insensitive lookup as fallback
  const lower = nationality.toLowerCase();
  for (const [key, flag] of Object.entries(NATIONALITY_FLAGS)) {
    if (key.toLowerCase() === lower) return flag;
  }
  return '';
}

/**
 * Returns true if the player is NOT Russian (foreign player).
 */
export function isForeignPlayer(nationality?: string | null): boolean {
  if (!nationality) return false;
  return nationality !== 'Россия';
}
