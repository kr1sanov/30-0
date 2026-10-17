import path from 'node:path';
import { pathToFileURL } from 'node:url';

const prismaModulePath = path.join(
  process.cwd(),
  '.next/standalone/node_modules/@prisma/client/default.js',
);
const { default: prismaClientModule } = await import(pathToFileURL(prismaModulePath).href);
const prisma = new prismaClientModule.PrismaClient();

try {
  const fullbacks = await prisma.playerSeason.findMany({
    where: { mainPosition: { in: ['ПЗ', 'ЛЗ'] } },
    select: { id: true, mainPosition: true, otherPositions: true },
  });

  const manual = new Set((await prisma.appSetting.findMany({where:{key:{startsWith:'player-card-manual:'}},select:{key:true}})).map(s=>s.key.slice('player-card-manual:'.length)));
  const updates = [];
  for (const playerSeason of fullbacks) {
    if (manual.has(playerSeason.id)) continue;
    const wingbackPosition = playerSeason.mainPosition === 'ПЗ' ? 'ПФЗ' : 'ЛФЗ';
    const positions = (playerSeason.otherPositions ?? '')
      .split(',')
      .map((position) => position.trim())
      .filter(Boolean);
    if (positions.includes(wingbackPosition)) continue;

    updates.push(prisma.playerSeason.update({
      where: { id: playerSeason.id },
      data: { otherPositions: [...new Set([...positions, wingbackPosition])].join(',') },
    }));
  }

  if (updates.length) await prisma.$transaction(updates);
  console.log(`Обновлено записей игроков: ${updates.length} из ${fullbacks.length}.`);
} catch (error) {
  console.error('Не удалось обновить фланговые позиции:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
