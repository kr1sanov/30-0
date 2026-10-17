import{test}from'node:test';import assert from'node:assert/strict';import{createServer}from'node:http';import{once}from'node:events';import{createWorkerClient}from'../scripts/notification-worker-client.mjs';
test('worker retries an HTTP outage with the same acknowledgement identity',async()=>{
 const received=[];const server=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;received.push({secret:req.headers['x-30-0-worker'],body});res.setHeader('Content-Type','application/json');res.statusCode=received.length===1?503:200;res.end(JSON.stringify({ok:received.length>1}));});server.listen(0,'127.0.0.1');await once(server,'listening');
 try{const worker=createWorkerClient({secret:'local-only-test',url:`http://127.0.0.1:${server.address().port}/`,delay:async()=>{}});assert.equal((await worker({action:'ack',id:'outbox-id',attempt:2,ok:true})).ok,true);assert.equal(received.length,2);assert.deepEqual(received[0],received[1]);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('authentication failures stop immediately and transport errors redact secrets',async()=>{
 let calls=0;const denied=createWorkerClient({secret:'do-not-log',fetchImpl:async()=>{calls++;return new Response('{}',{status:401});},delay:async()=>{}});await assert.rejects(denied(),/HTTP 401/);assert.equal(calls,1);
 const unavailable=createWorkerClient({secret:'do-not-log',fetchImpl:async()=>{throw Object.assign(new Error('do-not-log'),{cause:{code:'UND_ERR_CONNECT_TIMEOUT'}});},delay:async()=>{}});await assert.rejects(unavailable(),error=>error.code==='UND_ERR_CONNECT_TIMEOUT'&&!error.message.includes('do-not-log'));
});
