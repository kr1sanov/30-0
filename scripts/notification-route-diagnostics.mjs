import dns from 'node:dns/promises';
import tls from 'node:tls';
import {execFile}from'node:child_process';
import{promisify}from'node:util';
await Promise.all(['30-0.xn--p1ai','cloud.telegram.org'].map(async host=>{
 try{console.log('DNS',host,JSON.stringify(await dns.lookup(host,{all:true})));}catch(e){console.log('DNS_ERROR',host,e.code);}
 await new Promise(done=>{const s=tls.connect({host,port:443,servername:host});s.setTimeout(7000);s.on('connect',()=>console.log('TCP_OK',host));s.on('secureConnect',()=>{console.log('TLS_OK',host,s.authorized);s.end();done();});s.on('timeout',()=>{console.log('CONNECT_TIMEOUT',host);s.destroy();done();});s.on('error',e=>{console.log('CONNECT_ERROR',host,e.code);done();});});
}));
try{const r=await fetch('https://30-0.xn--p1ai/api/health',{signal:AbortSignal.timeout(12000)});console.log('FETCH',r.status);}catch(e){console.log('FETCH_ERROR',e.name,e.cause?.code,JSON.stringify(e.cause?.errors?.map(e=>({code:e.code,address:e.address}))||[]));}
try{const r=await promisify(execFile)('curl',['-4','--max-time','12','-sS','-o','/dev/null','-w','%{http_code}','https://30-0.xn--p1ai/api/health']);console.log('CURL_STATUS',r.stdout);}catch(e){console.log('CURL_ERROR',e.code);}
