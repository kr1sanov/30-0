import { readFileSync } from 'node:fs';

const files = ['scripts/data/rpl-2000-2010.json', 'scripts/data/rpl-2011-2026.json'];
const records = files.flatMap(file => JSON.parse(readFileSync(file, 'utf8')).map((record, index) => ({ ...record, _file: file, _line: index + 1 })));
const errors = [];
const warnings = [];
const seasons = new Map();
const uniquePlayers = new Set();
const uniqueKeys = new Set();

for (const record of records) {
  const ref = `${record._file}:${record._line}`;
  const year = Number(record.season);
  if (!record.fullName || !record.club || !record.mainPosition || !Number.isInteger(year)) errors.push(`${ref}: отсутствует обязательное поле`);
  if (!Number.isInteger(record.rating) || record.rating < 1 || record.rating > 99) errors.push(`${ref}: рейтинг вне диапазона 1–99`);
  const key = `${record.fullName}\0${record.club}\0${record.season}`;
  if (uniqueKeys.has(key)) errors.push(`${ref}: дубль игрока, клуба и сезона`);
  uniqueKeys.add(key);
  uniquePlayers.add(record.fullName);
  const rosterKey = `${record.season}\0${record.club}`;
  seasons.set(rosterKey, (seasons.get(rosterKey) ?? 0) + 1);
}

const years = [...new Set(records.map(record => Number(record.season)))].sort((a, b) => a - b);
for (let year = years[0]; year <= years.at(-1); year += 1) {
  if (!years.includes(year)) errors.push(`Отсутствует сезон ${year}`);
}
for (const [key, count] of seasons) {
  const [season, club] = key.split('\0');
  if (count < 18) errors.push(`${season}, ${club}: только ${count} игроков`);
  if (count > 35) warnings.push(`${season}, ${club}: ${count} игроков, требуется ручная проверка`);
}

// The current files have no per-record source URL or verification timestamp.
if (records.some(record => !record.sourceUrl || !record.verifiedAt)) {
  errors.push('У записей нет обязательных sourceUrl и verifiedAt');
}

const report = {
  files,
  records: records.length,
  uniquePlayers: uniquePlayers.size,
  seasons: years.length ? `${years[0]}–${years.at(-1)}` : null,
  clubSeasons: seasons.size,
  errors: errors.length,
  warnings: warnings.length,
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) {
  console.log('\nПервые ошибки:');
  for (const error of errors.slice(0, 25)) console.log(`- ${error}`);
  if (errors.length > 25) console.log(`- …ещё ${errors.length - 25}`);
}
if (warnings.length) {
  console.log('\nПервые предупреждения:');
  for (const warning of warnings.slice(0, 10)) console.log(`- ${warning}`);
}
if (process.argv.includes('--strict') && errors.length) process.exitCode = 1;
