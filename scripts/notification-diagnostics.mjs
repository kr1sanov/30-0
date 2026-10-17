const token = process.env.TGCLOUD_TOKEN || '';
if (!/^app\d+:[A-Za-z0-9_-]+$/.test(token)) throw new Error('Cloud configuration unavailable');
const source = `import { fetch } from 'sdk'; export default async function() { try { const response = await fetch('https://30-0.xn--p1ai/api/health'); return { status: response.status }; } catch(error) { return { error: String(error.message || error).slice(0,300) }; } }`;
const response = await fetch('https://cloud.telegram.org/'+token.split(':')[0]+'/manage/run', {method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+token}, body:JSON.stringify({module:'endpoints/networkProbe',sources:{'endpoints/networkProbe':source},args:{},ctx:{}}),signal:AbortSignal.timeout(25000)});
const envelope = await response.json().catch(()=>({}));
const scrub = value => String(value || '').split(token).join('[redacted]').replace(/app\d+:[A-Za-z0-9_-]+/g,'[redacted]').slice(0,400);
console.log(JSON.stringify({transport:'cloud',status:response.status,ok:envelope.ok,result:envelope.result?.result,reason:scrub(envelope.description || envelope.error?.message || envelope.error)}));
