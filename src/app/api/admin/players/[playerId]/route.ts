import { db } from '@/lib/db';
import { canAdminWrite,requireAdmin } from '@/lib/adminAuth';
import { sameOrigin } from '@/lib/telegramSession';
import { ALL_POSITIONS,canFillSlotStrict, type Position } from '@/lib/positions';
import { z } from 'zod';
const text=(max:number)=>z.string().trim().max(max).refine(s=>!/[\x00-\x1f<>]/.test(s));
const person=z.object({firstName:text(100).nullable(),lastName:text(100).min(1),alias:text(50).nullable(),nationality:text(80).nullable(),birthYear:z.number().int().min(1900).max(2026).nullable()}).strict();
const card=z.object({id:z.string().min(1),rating:z.number().int().min(1).max(100),primeRating:z.number().int().min(0).max(100),primeSeason:text(50).nullable(),mainPosition:z.enum(ALL_POSITIONS as [string,...string[]]),otherPositions:text(255).nullable(),nationality:text(80).nullable(),age:z.number().int().min(14).max(60).nullable(),shirtNumber:z.number().int().min(0).max(99).nullable(),matches:z.number().int().min(0).max(1000).nullable(),goals:z.number().int().min(0).max(1000).nullable(),assists:z.number().int().min(0).max(1000).nullable(),sourceName:text(255).nullable(),sourcePosition:text(50).nullable(),sourceUrl:z.string().url().max(1000).nullable()}).strict();
export async function GET(request:Request,{params}:{params:Promise<{playerId:string}>}){
 if(!await requireAdmin(request))return Response.json({error:'Access denied'},{status:401});
 const {playerId}=await params;
 const player=await db.player.findUnique({where:{id:playerId},include:{seasons:{include:{clubSeason:{include:{club:true,season:true}}},orderBy:{clubSeason:{season:{startYear:'desc'}}}}}});
 return player?Response.json({player}):Response.json({error:'Игрок не найден'},{status:404});
}
export async function PATCH(request:Request,{params}:{params:Promise<{playerId:string}>}){
 const actor=await requireAdmin(request);
 if(!actor||!canAdminWrite(actor.role,'players')||!sameOrigin(request))return Response.json({error:'Access denied'},{status:403});
 const {playerId}=await params;const parsed=z.object({player:person.optional(),season:card.optional()}).strict().safeParse(await request.json().catch(()=>null));
 if(!parsed.success||(!parsed.data.player&&!parsed.data.season))return Response.json({error:'Проверь данные игрока'},{status:400});
 const p=await db.player.findUnique({where:{id:playerId}});if(!p)return Response.json({error:'Игрок не найден'},{status:404});
 const season=parsed.data.season;
 if(season){if(!await db.playerSeason.findFirst({where:{id:season.id,playerId}}))return Response.json({error:'Карточка не принадлежит игроку'},{status:400});const extra=(season.otherPositions||'').split(',').map(s=>s.trim()).filter(Boolean);if((season.primeRating>0&&season.primeRating<season.rating)||extra.some(s=>!ALL_POSITIONS.includes(s as typeof ALL_POSITIONS[number])||s===season.mainPosition))return Response.json({error:'Проверь позиции и прайм-рейтинг'},{status:400});}
 await db.$transaction(async tx=>{
  if(parsed.data.player){const v=parsed.data.player;const fullName=[v.firstName,v.lastName].filter(Boolean).join(' ');await tx.player.update({where:{id:playerId},data:{...v,alias:v.alias||null,firstName:v.firstName||null,fullName}});const ids=await tx.playerSeason.findMany({where:{playerId},select:{id:true}});await tx.gameSlot.updateMany({where:{playerSeasonId:{in:ids.map(s=>s.id)},run:{completed:false}},data:{playerName:v.alias||fullName,playerLastName:v.alias||v.lastName}});}
  if(season){const {id,...v}=season;const key=`player-card-manual:${id}`;await tx.appSetting.upsert({where:{key},create:{key,value:new Date().toISOString()},update:{value:new Date().toISOString()}});await tx.playerSeason.update({where:{id},data:v});const slots=await tx.gameSlot.findMany({where:{playerSeasonId:id,run:{completed:false}}});for(const s of slots)await tx.gameSlot.update({where:{id:s.id},data:{playerRating:v.rating,playerPrimeRating:v.primeRating,playerPosition:v.mainPosition,playerOtherPositions:v.otherPositions,playerNationality:v.nationality,isCompatible:canFillSlotStrict(v.mainPosition as Position,(v.otherPositions||'').split(',').map(p=>p.trim()) as Position[],s.slotPosition.split('_')[0] as Position)}});}
 });
 return Response.json({ok:true});
}
