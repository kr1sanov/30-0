import { ALL_POSITIONS, type Position } from './positions.ts';

export const ROSTER_COLUMNS = [
  'clubName', 'clubNameEn', 'fullName', 'lastName', 'firstName', 'nationality',
  'birthYear', 'mainPosition', 'otherPositions', 'rating', 'primeRating', 'sourceUrl', 'playerId',
] as const;

export type RosterRow = {
  line: number;
  clubName: string;
  clubNameEn: string | null;
  fullName: string;
  lastName: string;
  firstName: string | null;
  nationality: string | null;
  birthYear: number | null;
  mainPosition: Position;
  otherPositions: string | null;
  rating: number;
  primeRating: number;
  sourceUrl: string | null;
  playerId: string | null;
};

export class RosterImportError extends Error {}

function cells(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  let closed = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else field += char;
    } else if (char === '"' && field === '' && !closed) quoted = true;
    else if (char === ',') { record.push(field.trim()); field = ''; closed = false; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      record.push(field.trim());
      if (record.some(value => value)) records.push(record);
      record = []; field = ''; closed = false;
    } else if (closed && char !== ' ' && char !== '\t') {
      throw new RosterImportError(`Недопустимый символ после кавычки в строке ${records.length + 1}`);
    } else if (!closed) field += char;
  }
  if (quoted) throw new RosterImportError('Незакрытая кавычка в CSV');
  record.push(field.trim());
  if (record.some(value => value)) records.push(record);
  return records;
}

export function parseRosterCsv(input: string): RosterRow[] {
  if (Buffer.byteLength(input, 'utf8') > 1024 * 1024) throw new RosterImportError('Файл должен быть меньше 1 МБ');
  const records = cells(input.replace(/^\uFEFF/, ''));
  if (!records.length || records[0].join(',') !== ROSTER_COLUMNS.join(',')) {
    throw new RosterImportError(`Заголовки должны совпадать с образцом: ${ROSTER_COLUMNS.join(', ')}`);
  }
  if (records.length < 2 || records.length > 2001) throw new RosterImportError('Добавьте от 1 до 2000 игроков');
  const seen = new Set<string>();
  return records.slice(1).map((record, index) => {
    const line = index + 2;
    if (record.length !== ROSTER_COLUMNS.length) throw new RosterImportError(`Строка ${line}: ожидается ${ROSTER_COLUMNS.length} столбцов, получено ${record.length}`);
    const values = Object.fromEntries(ROSTER_COLUMNS.map((key, i) => [key, record[i]])) as Record<typeof ROSTER_COLUMNS[number], string>;
    const required = ['clubName', 'fullName', 'lastName', 'mainPosition', 'rating'] as const;
    if (required.some(key => !values[key])) throw new RosterImportError(`Строка ${line}: заполни клуб, полное имя, фамилию, позицию и рейтинг`);
    if (['clubName', 'clubNameEn', 'fullName', 'lastName', 'firstName', 'nationality'].some(key => values[key as keyof typeof values].length > 255)) {
      throw new RosterImportError(`Строка ${line}: имя или название слишком длинное`);
    }
    const rating = Number(values.rating);
    const primeRating = values.primeRating ? Number(values.primeRating) : rating;
    if (!/^\d+$/.test(values.rating) || !Number.isInteger(rating) || rating < 1 || rating > 100 ||
      (values.primeRating && !/^\d+$/.test(values.primeRating)) || !Number.isInteger(primeRating) || primeRating < rating || primeRating > 100) {
      throw new RosterImportError(`Строка ${line}: рейтинг — целое число 1–100, прайм не ниже рейтинга`);
    }
    const birthYear = values.birthYear ? Number(values.birthYear) : null;
    if (values.birthYear && (!/^\d{4}$/.test(values.birthYear) || birthYear! < 1900 || birthYear! > new Date().getUTCFullYear())) {
      throw new RosterImportError(`Строка ${line}: проверь год рождения`);
    }
    const valid = new Set<string>(ALL_POSITIONS);
    const other = values.otherPositions ? values.otherPositions.split('|').map(value => value.trim()) : [];
    if (!valid.has(values.mainPosition) || other.some(pos => !valid.has(pos)) || other.includes(values.mainPosition)) {
      throw new RosterImportError(`Строка ${line}: неверная позиция. Используй коды из памятки, дополнительные позиции разделяй |`);
    }
    if (values.sourceUrl) {
      try { const url = new URL(values.sourceUrl); if (!['https:', 'http:'].includes(url.protocol) || values.sourceUrl.length > 1500) throw Error(); }
      catch { throw new RosterImportError(`Строка ${line}: укажи корректную ссылку на источник`); }
    }
    if (values.playerId && !/^[a-zA-Z0-9_-]{1,64}$/.test(values.playerId)) throw new RosterImportError(`Строка ${line}: неверный ID игрока`);
    const key = `${values.clubName.toLocaleLowerCase()}|${values.fullName.toLocaleLowerCase()}|${values.birthYear}`;
    if (seen.has(key)) throw new RosterImportError(`Строка ${line}: игрок дважды указан в составе одного клуба`);
    seen.add(key);
    return {
      line, clubName: values.clubName, clubNameEn: values.clubNameEn || null,
      fullName: values.fullName, lastName: values.lastName, firstName: values.firstName || null,
      nationality: values.nationality || null, birthYear, mainPosition: values.mainPosition as Position,
      otherPositions: other.length ? other.join(',') : null, rating, primeRating,
      sourceUrl: values.sourceUrl || null, playerId: values.playerId || null,
    };
  });
}
