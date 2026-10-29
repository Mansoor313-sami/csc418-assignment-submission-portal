import http from 'node:http';
import {mkdir,writeFile,rename,readFile,readdir} from 'node:fs/promises';
import {timingSafeEqual} from 'node:crypto';
import path from 'node:path';
const port=Number(process.env.RECEIVER_PORT||5055);
const token=process.env.REPORT_TOKEN;
if(!token){throw new Error('Set REPORT_TOKEN before starting the receiver.');}
const root=path.resolve(process.env.REPORT_DIR||'.');
await mkdir(path.join(root,'report-history'),{recursive:true});
function authorized(req){const actual=Buffer.from(req.headers.authorization||'');const expected=Buffer.from('Bearer '+token);return actual.length===expected.length&&timingSafeEqual(actual,expected);}
function valid(r){return typeof r.repository==='string'&&typeof r.branch==='string'&&typeof r.commit_sha==='string'&&typeof r.pipeline_run_id==='string'&&!isNaN(Date.parse(r.execution_timestamp))&&Array.isArray(r.tests)&&r.tests.length>0&&r.tests.every(t=>typeof t.name==='string'&&['passed','failed'].includes(t.result)&&(t.result!=='failed'||typeof t.failure_message==='string'))&&r.total===r.tests.length&&r.passed===r.tests.filter(t=>t.result==='passed').length&&r.failed===r.tests.filter(t=>t.result==='failed').length&&r.overall_status===(r.failed?'failed':'passed');}
// Serialize writes so concurrent reports cannot overwrite a shared temporary file.
let queue=Promise.resolve();
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&url.pathname.startsWith('/submission-context/')){
    if(!authorized(req)){res.writeHead(401).end();return;}
    const id=url.pathname.slice('/submission-context/'.length);
    if(!/^[-a-zA-Z0-9]{1,80}$/.test(id)){res.writeHead(400).end();return;}
    try{res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(await readFile(path.join(root,'submission-contexts',id+'.json')));}catch{res.writeHead(404).end();}return;
  }
  if(req.method==='GET'&&url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({status:'ready',receiver:'CSC418 local test report receiver'}));return;}
  if(req.method==='GET'&&['/dashboard','/report'].includes(url.pathname)){
    if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)){res.writeHead(403).end();return;}
    try{
      if(url.pathname==='/dashboard'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(await readFile(new URL('./dashboard.html',import.meta.url)));return;}
      const file=url.searchParams.get('file')||'';
      if(!/^[\w.-]+\.json$/.test(file)){res.writeHead(400).end();return;}
      res.writeHead(200,{'Content-Type':'application/json'}).end(await readFile(path.join(root,'report-history',file)));
    }catch{res.writeHead(404).end('Report not found');}return;
  }
  if(req.method==='GET'&&url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end('<html><head><title>Local Test Report Receiver</title></head><body style="font:18px Segoe UI;max-width:1000px;margin:45px auto;background:#f4f7f5;color:#234637"><h1>Local Test Report Receiver</h1><p>Receiver is running on this computer. Completed CI reports are saved automatically.</p><p><a href="/latest">View latest test-report.json</a> | <a href="/history">View report history</a></p><p>POST /reports requires the configured secret token.</p></body></html>');return;}
  // These read-only evidence routes exist on loopback only; never expose reports through a tunnel.
  if(req.method==='GET'&&['/latest','/history'].includes(url.pathname)){
    if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host)){res.writeHead(403).end();return;}
    try{const body=url.pathname==='/latest'?await readFile(path.join(root,'test-report.json'),'utf8'):JSON.stringify(await readdir(path.join(root,'report-history')),null,2);res.writeHead(200,{'Content-Type':'application/json'}).end(body);}catch{res.writeHead(404).end('No report received yet');}return;
  }
  if(req.method!=='POST'||url.pathname!=='/reports'){res.writeHead(404).end();return;}
  if(!authorized(req)){res.writeHead(401).end('Unauthorized');return;}
  let body='';
  try{
    for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>1024*1024){res.writeHead(413).end();return;}}
    const report=JSON.parse(body);if(!valid(report)){res.writeHead(422).end('Invalid test report');return;}
    const payload=JSON.stringify({...report,received_at:new Date().toISOString()},null,2)+'\n';
    const safe=`${report.pipeline_run_id}-${report.run_attempt||1}-${report.overall_status}`.replace(/[^\w.-]/g,'_');
    const save=queue.then(async()=>{await writeFile(path.join(root,'report-history',safe+'.json'),payload);const temp=path.join(root,'test-report.json.tmp');await writeFile(temp,payload);await rename(temp,path.join(root,'test-report.json'));});queue=save.catch(()=>{});await save;
    console.log(`${new Date().toISOString()} RECEIVED ${report.overall_status.toUpperCase()} ${report.passed}/${report.total} | run ${report.pipeline_run_id} | ${report.commit_sha}`);
    res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({saved:true,file:'test-report.json',run_id:report.pipeline_run_id}));
  }catch(error){console.error(error.message);res.writeHead(400).end('Could not accept report');}
}).listen(port,'127.0.0.1',()=>console.log(`Receiver ready: http://127.0.0.1:${port} | output ${root}`));
