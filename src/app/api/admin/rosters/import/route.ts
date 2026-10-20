/** File-based roster import was retired in favour of the searchable player editor. */
export function POST() { return Response.json({ error: 'Импорт файлов отключён. Добавляй игроков через поиск или копируй состав в разделе «Составы».' }, { status: 410 }); }
