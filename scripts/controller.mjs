import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const exec=promisify(execFile), repo='repos/Mansoor313-sami/csc418-assignment-submission-portal';
const session=randomBytes(32).toString('hex');
let busy=false;
async function api(endpoint,method='GET',body){
 const args=['-NoProfile','-File','scripts/github-api.ps1','-Endpoint',repo+endpoint,'-Method',method];
 // The helper obtains credentials from Windows Credential Manager; no token reaches the browser.
 if(body){const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');const dir=await mkdtemp(path.join(tmpdir(),'submitly-'));try{const file=path.join(dir,'request.json');await writeFile(file,JSON.stringify(body));const {stdout}=await exec('powershell.exe',[...args,'-BodyFile',file],{maxBuffer:8e6});return stdout.trim()?JSON.parse(stdout):null;}finally{await rm(dir,{recursive:true,force:true});}}
 const {stdout}=await exec('powershell.exe',args,{maxBuffer:8e6});return stdout.trim()?JSON.parse(stdout):null;
}
export async function controller(req,res,url){
 if(!url.pathname.startsWith('/api/'))return false;
 const respond=(status,data)=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(data));
 if(!['127.0.0.1:'+req.socket.localPort,'localhost:'+req.socket.localPort].includes(req.headers.host)){respond(403,{error:'Local access only'});return true;}
 const origin=req.headers.origin;
 const allowed=new Set([`http://${req.headers.host}`,'https://mansoor313-sami.github.io']);
 if(origin&&!allowed.has(origin)){respond(403,{error:'Open the submission portal to continue'});return true;}
 if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Controller-Session','Access-Control-Allow-Private-Network':'true','Access-Control-Max-Age':'600'}).end();return true;}
 try{
 if(req.method==='GET'&&url.pathname==='/api/session'){respond(200,{session});return true;}
 if(req.method==='GET'&&url.pathname==='/api/status'){
 const runs=await api('/actions/workflows/ci.yml/runs?branch=main&per_page=6');
 const id=url.searchParams.get('run')||runs.workflow_runs[0]?.id;
 const run=id?runs.workflow_runs.find(r=>String(r.id)===String(id))||await api('/actions/runs/'+encodeURIComponent(id)):null;
 const jobs=run?await api('/actions/runs/'+run.id+'/jobs'): {jobs:[]};
 let reports=[];try{for(const file of await readdir('report-history')){if(/^\d.*\.json$/.test(file))reports.push(JSON.parse(await readFile('report-history/'+file,'utf8')));}}catch{}
 const report=reports.filter(r=>String(r.pipeline_run_id)===String(run?.id)&&String(r.run_attempt||1)===String(run?.run_attempt||1)).sort((a,b)=>b.received_at.localeCompare(a.received_at))[0]||null;
 respond(200,{busy,run,jobs:jobs.jobs,report,runs:runs.workflow_runs.map(r=>({id:r.id,name:r.display_title,status:r.status,conclusion:r.conclusion}))});return true;
 }
 if(req.method==='POST'&&url.pathname==='/api/action'){
 if(req.headers['x-controller-session']!==session){respond(403,{error:'Refresh the local dashboard'});return true;}
 if(busy){respond(409,{error:'Another action is already running'});return true;}
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8192)throw Error('Request too large');}
 const {action,submission}=JSON.parse(raw);if(!['run','defect','fix'].includes(action)){respond(400,{error:'Unknown action'});return true;}
 let context=null;
 if(submission){
 const {validateSubmission}=await import('../web/portal.mjs');
 if(Object.keys(validateSubmission(submission)).length||!/^[-a-zA-Z0-9]{1,80}$/.test(submission.id||'')){respond(400,{error:'Valid submission details are required'});return true;}
 context=Object.fromEntries(['id','name','registration','title','url'].map(key=>[key,submission[key]]));
 if(Object.values(context).some(v=>v.length>500)){respond(400,{error:'Submission details are too long'});return true;}
 await mkdir('submission-contexts',{recursive:true});await writeFile('submission-contexts/'+context.id+'.json',JSON.stringify(context));
 }
 busy=true;
 try{
 if(action==='run'){await api('/actions/workflows/ci.yml/dispatches','POST',{ref:'main',inputs:{submission:context?JSON.stringify(context):''}});respond(200,{message:'Test run requested. Waiting for GitHub…'});}
 else {
 // Update exactly one known validation expression through GitHub's Contents API.
 const file=await api('/contents/web/portal.mjs?ref=main');const original=Buffer.from(file.content,'base64').toString('utf8');
 const good="if (typeof input[field] !== 'string' || !input[field].trim())";
 const bad="if (field !== 'registration' && (typeof input[field] !== 'string' || !input[field].trim()))";
 const from=action==='defect'?good:bad,to=action==='defect'?bad:good;
 if(!original.includes(from)){respond(409,{error:action==='defect'?'The demo defect is already present. Push the fix first.':'Validation is already fixed. No change was pushed.'});}
 else {const result=await api('/contents/web/portal.mjs','PUT',{message:(action==='defect'?'Demo: introduce registration validation defect':'Fix: restore registration validation')+(context?'\n\nSubmission-ID: '+context.id:''),content:Buffer.from(original.replace(from,to)).toString('base64'),sha:file.sha,branch:'main'});respond(200,{message:action==='defect'?'Defect pushed. GitHub will test this commit.':'Fix pushed. GitHub will test this commit.',commit:result.commit.sha});}
 }
 }finally{busy=false;}return true;
 }
 respond(404,{error:'Not found'});
 }catch(error){respond(502,{error:'Could not complete the request. Check GitHub sign-in and the local controller terminal.'});console.error(error.message);}
 return true;
}
