/** Preserve manual identity edits and audit/merge only independently corroborated duplicates. */
import { PrismaClient } from '@prisma/client';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const source = existsSync(resolve('src/lib/playerDuplicates.ts')) ? resolve('src/lib') : resolve('scripts/admin-player-data');
const { playerDuplicateGroups } = await import(`file://${source}/playerDuplicates.ts`);
const { mergeWithinTransaction } = await import(`file://${source}/adminPlayerMerge.ts`);
const db = new PrismaClient();
const apply = process.argv.includes('--apply-safe');
try {
  if (apply) {
    const identities = await db.appSetting.findMany({where:{key:{startsWith:'player-identity-manual:'}}});
    for (const setting of identities) {
      const id=setting.key.slice('player-identity-manual:'.length);
      if (await db.player.findUnique({where:{id}})) await db.player.update({where:{id},data:JSON.parse(setting.value)});
    }
  }
  const players = await db.player.findMany({where:{mergedIntoId:null},include:{seasons:{select:{clubSeasonId:true,sourceUrl:true,rating:true,mainPosition:true,clubSeason:{select:{clubId:true,season:{select:{startYear:true}}}}}}}});
  const groups=playerDuplicateGroups(players.map(p=>({...p,seasons:p.seasons.map(s=>({...s,clubId:s.clubSeason.clubId,year:s.clubSeason.season.startYear}))})));
  const report={at:new Date().toISOString(),scanned:players.length,groups:groups.length,safeGroups:groups.filter(g=>g.safe).length,reviewGroups:groups.filter(g=>!g.safe).length,merged:0};
  if (apply && groups.some(g=>g.safe)) {
    const directory=process.env.MIGRATION_BACKUP_DIR;
    if (!directory) throw new Error('Private backup directory required before merging');
    mkdirSync(directory,{recursive:true,mode:0o700});
    writeFileSync(resolve(directory,`player-duplicate-audit-${Date.now()}.json`),JSON.stringify(groups,null,2),{mode:0o600});
    for (const group of groups.filter(g=>g.safe)) for (const duplicate of group.members.slice(1)) {
      await db.$transaction(tx=>mergeWithinTransaction(tx,group.targetId,duplicate.id,'verified-data-audit'),{timeout:30000,isolationLevel:'Serializable'});report.merged++;
    }
  }
  if (apply) {
    const key='player-data-audit:last';
    await db.appSetting.upsert({where:{key},create:{key,value:JSON.stringify(report)},update:{value:JSON.stringify(report)}});
  }
  console.log('PLAYER_DATA_AUDIT',JSON.stringify(report));
} finally { await db.$disconnect(); }
