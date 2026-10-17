import { api, db, InputFile } from 'sdk';
import { eq, and, lte } from 'sdk/db';
import { botPreferences, botDeliveries } from '../schema.js';
import { normalize } from './preferences.js';
import { deliverNotification } from './deliveryCore.js';
export async function deliveryHealth() {
  const identity = await api.getMe({});
  return {ok:Boolean(identity.id), deliveries:await db.$count(botDeliveries)};
}
export async function deliver(message) {
  const store = {
    async preferences(tgId) {
      const row = await db.select().from(botPreferences).where(eq(botPreferences.tgId,tgId)).get();
      return row ? {...normalize(row.prefsJson),started:Boolean(row.started)} : null;
    },
    async claim(id,tgId) {
      await db.insert(botDeliveries).values({id,tgId}).onConflictDoNothing().run();
      const row = await db.select().from(botDeliveries).where(eq(botDeliveries.id,id)).get();
      if (row.tgId !== tgId) throw new Error('Recipient mismatch');
      if (row.state === 'sent') return 'sent';
      const now = Date.now();
      const claimed = await db.update(botDeliveries).set({leaseUntil:now+120000}).where(and(eq(botDeliveries.id,id),eq(botDeliveries.state,'pending'),lte(botDeliveries.leaseUntil,now))).returning().run();
      return claimed.length ? 'claimed' : 'busy';
    },
    async finish(id,state) {
      await db.update(botDeliveries).set({state,leaseUntil:0}).where(eq(botDeliveries.id,id)).run();
    },
  };
  return deliverNotification(message, store, async (item,image) => {
    const body = {chat_id:item.chatId,parse_mode:'HTML',reply_markup:item.keyboard};
    if (image) await api.sendPhoto({...body,photo:new InputFile(image,'30-0.png',{type:'image/png'}),caption:item.text});
    else await api.sendMessage({...body,text:item.text});
  });
}
