import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeImage,deliverNotification} from '../tgcloud/lib/deliveryCore.js';
const item={id:'outbox-1',chatId:123,category:'results',text:'Season result',keyboard:{inline_keyboard:[]}};
function fixture(prefs={started:true,enabled:true,results:true}){
 let state='pending',busy=false,calls=0;
 return {store:{preferences:async()=>prefs,claim:async()=>state==='sent'?'sent':busy?'busy':(busy=true,'claimed'),finish:async(_,s)=>{state=s;busy=false;}},send:async()=>{calls++;},count:()=>calls};
}
test('Serverless delivery observes opt-outs and retries without duplicate sends',async()=>{
 const f=fixture();assert.equal((await deliverNotification(item,f.store,f.send)).ok,true);
 assert.equal((await deliverNotification(item,f.store,f.send)).ok,true);assert.equal(f.count(),1);
 const off=fixture({started:true,enabled:true,results:false});assert.equal((await deliverNotification(item,off.store,off.send)).skipped,true);assert.equal(off.count(),0);
 const notStarted=fixture({started:false});assert.equal((await deliverNotification(item,notStarted.store,notStarted.send)).ok,false);
});
test('SDK errors retain Telegram retry timing and permit another attempt',async()=>{
 const f=fixture();const failed=await deliverNotification(item,f.store,async()=>{throw {code:429,parameters:{retry_after:73}};});assert.equal(failed.retryAfter,73);assert.equal(failed.errorCode,429);
 assert.equal((await deliverNotification(item,f.store,f.send)).ok,true);
});
test('image bytes round-trip through SDK without Buffer or browser globals',()=>{
 for(const n of [1,2,3,10000]){const b=Buffer.alloc(n,173);assert.deepEqual(decodeImage(b.toString('base64')),new Uint8Array(b));}
 assert.throws(()=>decodeImage('not base64!'));
});
