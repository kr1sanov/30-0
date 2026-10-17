const WORKER_URL = 'https://30-0.xn--p1ai/api/telegram/worker';
function transportCode(error) {
  const code = error?.cause?.code || error?.code || error?.name;
  return typeof code === 'string' && /^[A-Z][A-Z0-9_]{1,40}$/.test(code) ? code : 'TRANSPORT_UNAVAILABLE';
}
export function createWorkerClient({secret,url=WORKER_URL,fetchImpl=fetch,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))}) {
  return async function worker(body={}) {
    let lastCode='TRANSPORT_UNAVAILABLE';
    for(let attempt=0;attempt<3;attempt++) {
      try {
        const response=await fetchImpl(url,{method:'POST',headers:{'Content-Type':'application/json','X-30-0-Worker':secret},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
        if(!response.ok) {
          const error=Object.assign(new Error('Notification worker HTTP '+response.status),{code:'HTTP_'+response.status,permanent:response.status>=400&&response.status<500&&![408,429].includes(response.status)});
          throw error;
        }
        return await response.json();
      } catch(error) {
        if(error.permanent) throw error;
        lastCode=transportCode(error);
        if(attempt<2) await delay(1000*(attempt+1));
      }
    }
    // Only a bounded error code enters CI logs, never headers, tokens or payloads.
    throw Object.assign(new Error('Notification worker unavailable ('+lastCode+')'),{code:lastCode});
  };
}
