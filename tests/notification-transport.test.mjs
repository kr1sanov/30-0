import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { postNotificationWorker } from '../scripts/notification-transport.mjs';
async function server(handler, run) {
  const http = createServer(handler);
  await new Promise(resolve => http.listen(0,'127.0.0.1',resolve));
  try { await run(`http://127.0.0.1:${http.address().port}/worker`); }
  finally { await new Promise(resolve => http.close(resolve)); }
}
test('notification transport preserves authenticated JSON, Unicode, quotes and line breaks', async () => {
  const body = { action:'sync', text:'Имя "Иван"\nLine two \\ end', enabled:false };
  await server(async (request,response) => {
    assert.equal(request.headers['x-30-0-worker'],'fixture-only-key');
    let received='';for await (const chunk of request) received+=chunk;
    assert.deepEqual(JSON.parse(received),body);
    response.end(JSON.stringify({ok:true}));
  }, async url => assert.deepEqual(await postNotificationWorker(url,'fixture-only-key',body),{ok:true}));
});
test('notification transport recovers from a dropped connection and temporary server failure', async () => {
  let calls=0;
  await server((request,response) => {
    calls++;
    if(calls===1)return request.socket.destroy();
    if(calls===2){response.writeHead(503);return response.end('temporary');}
    response.end('{"ok":true}');
  },async url=>assert.deepEqual(await postNotificationWorker(url,'fixture-only-key'),{ok:true}));
  assert.equal(calls,3);
});
test('authorization failures stop immediately without exposing the secret', async () => {
  let calls=0;
  await server((request,response)=>{calls++;response.writeHead(401);response.end('denied');},async url=>{
    await assert.rejects(postNotificationWorker(url,'fixture-only-key'),error=>error.message==='Notification relay HTTP 401'&&!error.message.includes('fixture-only-key'));
  });
  assert.equal(calls,1);
});
