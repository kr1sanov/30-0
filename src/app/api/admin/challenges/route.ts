import { db } from '@/lib/db';
import { canAdminWrite, requireAdmin } from '@/lib/adminAuth';
import { sameOrigin } from '@/lib/telegramSession';
import { challengeCatalog } from '@/lib/challengeCatalog';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
const patchSchema=z.object({
 titleRu:z.string().trim().min(2).max(150).optional(),titleEn:z.string().trim().min(2).max(150).optional(),
 descriptionRu:z.string().trim().min(2).max(2000).optional(),descriptionEn:z.string().trim().min(2).max(2000).optional(),
 startsAt:z.string().datetime().optional(),endsAt:z.string().datetime().optional(),
 minimumGoals:z.number().int().min(0).max(300).optional(),minimumPoints:z.number().int().min(0).max(90).optional(),
 maximumConceded:z.number().int().min(0).max(300).nullable().optional(),minimumCleanSheets:z.number().int().min(0).max(30).nullable().optional(),
 achievementTitleRu:z.string().trim().min(2).max(100).optional(),achievementTitleEn:z.string().trim().min(2).max(100).optional(),
 achievementDescriptionRu:z.string().trim().max(500).optional(),achievementDescriptionEn:z.string().trim().max(500).optional(),achievementIcon:z.enum(['🏆','⚽','🎯','🧤','⚡','⭐']).optional(),
 matchLimit:z.number().int().min(1).max(30).nullable().optional(),requireTitle:z.boolean().optional(),unbeaten:z.boolean().optional(),
}).strict();
export async function GET(request: Request) {
 if (!await requireAdmin(request)) return Response.json({error:'Access denied'},{status:401});
 return Response.json({issues:await challengeCatalog()},{headers:{'Cache-Control':'no-store'}});
}
export async function PATCH(request:Request) {
 const admin=await requireAdmin(request);
 if (!admin||!canAdminWrite(admin.role,'rosters')||!sameOrigin(request)) return Response.json({error:'Access denied'},{status:403});
 const body=await request.json().catch(()=>({}));
 const issue=(await challengeCatalog()).find(i=>i.id===body.id);
 if (!issue || (body.visibility!==undefined&&!['auto','open','hidden','archived'].includes(body.visibility))) return Response.json({error:'Invalid issue'},{status:400});
 const parsed=patchSchema.safeParse(body.patch??{});
 if (!parsed.success) return Response.json({error:'Проверь условия и даты челленджа'},{status:400});
 const key=`challenge-config:${issue.id}`;
 const previous=await db.appSetting.findUnique({where:{key}});
 let saved={};try{saved=JSON.parse(previous?.value||'{}');}catch{}
 const patch={...saved,...parsed.data};
 // Reopening an expired issue gives it an explicit new end date. Open never bypasses expiry.
 if(body.visibility==='open'&&Date.parse(parsed.data.endsAt??issue.endsAt)<=Date.now()) {
   Object.assign(patch,{startsAt:new Date().toISOString(),endsAt:new Date(Date.now()+7*86400000).toISOString()});
 }
 const effective={...issue,...patch};
 if(Date.parse(effective.endsAt)<=Date.parse(effective.startsAt)||(effective.minimumCleanSheets??0)>(effective.matchLimit??30)||(effective.minimumPoints??0)>(effective.matchLimit??30)*3) return Response.json({error:'Проверь даты и число сухих матчей'},{status:400});
 await db.$transaction(async tx=>{
   await tx.appSetting.upsert({where:{key},create:{key,value:JSON.stringify(patch)},update:{value:JSON.stringify(patch)}});
   if(body.visibility!==undefined){const visibilityKey=`challenge-visibility:${issue.id}`;await tx.appSetting.upsert({where:{key:visibilityKey},create:{key:visibilityKey,value:body.visibility},update:{value:body.visibility}});}
 });
 return Response.json({ok:true});
}

export async function POST(request: Request) {
 const admin = await requireAdmin(request);
 if (!admin || !canAdminWrite(admin.role, 'rosters') || !sameOrigin(request)) return Response.json({error:'Нет прав'}, {status:403});
 const parsed = patchSchema.extend({ titleRu:z.string().trim().min(2).max(150),titleEn:z.string().trim().min(2).max(150),descriptionRu:z.string().trim().min(2).max(2000),descriptionEn:z.string().trim().min(2).max(2000), startsAt:z.string().datetime(),endsAt:z.string().datetime(),achievementTitleRu:z.string().trim().min(2).max(100),achievementTitleEn:z.string().trim().min(2).max(100) }).safeParse(await request.json().catch(()=>null));
 if (!parsed.success) return Response.json({error:'Заполни названия, описания, достижение и сроки'}, {status:400});
 const b = parsed.data;
 if(Date.parse(b.endsAt)<=Date.parse(b.startsAt) || (b.minimumCleanSheets??0)>(b.matchLimit??30) || (b.minimumPoints??0)>(b.matchLimit??30)*3) return Response.json({error:'Проверь даты и достижимость условий'}, {status:400});
 const id = `custom-${randomUUID()}`;
 const issue = { ...b, id, custom:true, mode:'challenge_custom', hero:'custom', featuredNames:[], minimumGoals:b.minimumGoals??0, minimumPoints:b.minimumPoints??0, requireTitle:b.requireTitle??false, unbeaten:b.unbeaten??false };
 await db.$transaction(async tx=>{
  await tx.appSetting.create({data:{key:`challenge-custom:${id}`,value:JSON.stringify(issue)}});
  await tx.appSetting.create({data:{key:`challenge-visibility:${id}`,value:'hidden'}});
 });
 return Response.json({id},{status:201});
}
