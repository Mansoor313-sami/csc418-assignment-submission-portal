const $=id=>document.getElementById(id);
let session='',selected='',pending=false,polling=false,lastMail='',lastRun='',waitingRun='',armed='',active=false,unlocked=false,timer;
const local=['127.0.0.1','localhost'].includes(location.hostname);
async function request(path,options={}){const r=await fetch((local?'/api/':'http://127.0.0.1:4173/api/')+path,{...options,headers:{'Content-Type':'application/json','X-Controller-Session':session,...options.headers}});const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');return data;}
function status(id,text,kind=''){const el=$(id);el.textContent=text;el.className=kind;}
function banner(text,kind='running'){$('result-banner').textContent=text;$('result-banner').className='result-banner '+kind;}
function lock(value){document.querySelectorAll('[data-action]').forEach(b=>b.disabled=value);$('upload-button').disabled=value;}
function clearResults(){banner('Starting tests');$('pipeline').textContent='Starting';for(const key of ['total','passed','failed'])$(key).textContent='—';status('report-status','Local report: waiting');status('email-status','Email: waiting');status('deploy-status','Deployment: waiting');$('tests').innerHTML='<tr><td colspan="3">Waiting for the new test run.</td></tr>';}
async function refresh(){if(polling||!active||pending)return;polling=true;try{
 const data=await request('status'+(selected?'?run='+encodeURIComponent(selected):''));$('connection').textContent='Connected';
 if(waitingRun&&String(data.run?.id)===waitingRun)return;
 waitingRun='';lastRun=String(data.run?.id||'');
 $('runs').replaceChildren(...data.runs.map(r=>{const o=document.createElement('option');o.value=r.id;o.textContent=`#${r.id} · ${r.name} · ${r.conclusion||r.status}`;return o;}));
 if(data.run){$('runs').value=data.run.id;$('run-link').href=data.run.html_url;$('pipeline').textContent=data.run.conclusion||data.run.status;$('commit').textContent=`Commit ${data.run.head_sha.slice(0,8)} · ${data.run.event==='push'?'Push-triggered run':'Manual test run'} · Attempt ${data.run.run_attempt}`;}
 const report=data.report;for(const key of ['total','passed','failed'])$(key).textContent=report?report[key]:'—';
 const steps=data.jobs.flatMap(j=>j.steps||[]),delivery=steps.find(s=>s.name==='Deliver completed report to local receiver'),email=steps.find(s=>s.name==='Email completed report');
 status('report-status',report?'Local report received':delivery?.conclusion==='failure'?'Local report delivery failed':'Local report: waiting',report?'success':delivery?.conclusion==='failure'?'failed':'');
 const sent=email?.conclusion==='success';status('email-status',sent?'Mail sent':email?.conclusion==='failure'?'Email failed':email?.status==='in_progress'?'Sending email':'Email: waiting',sent?'success':email?.conclusion==='failure'?'failed':'');
 const mailKey=sent?`${data.run.id}-${data.run.run_attempt}`:'';if(mailKey&&mailKey!==lastMail){$('email-status').classList.add('mail-pop');lastMail=mailKey;}
 const deploy=data.jobs.find(j=>j.name==='deploy');status('deploy-status',deploy?.conclusion==='success'?'Deployed':deploy?.conclusion==='skipped'?'Deployment skipped':deploy?.conclusion==='failure'?'Deployment failed':deploy?.status==='in_progress'?'Deploying':'Deployment: waiting',deploy?.conclusion==='success'?'success':'');
 if(report){$('tests').replaceChildren(...report.tests.map(t=>{const row=document.createElement('tr');for(const value of [t.name,t.result==='passed'?'PASS':'FAIL',t.failure_message||'—']){const td=document.createElement('td');td.textContent=value;row.append(td);}return row;}));}
 const done=data.run?.status==='completed';
 if(done&&!armed){$('action-message').textContent='';$('message').textContent='Submission saved.';}
 if(done&&data.run.conclusion==='success'&&report?.overall_status==='passed'){banner('SUCCESS! All tests passed.','success');unlocked=true;}
 else if(done){banner(report?.failed?'Tests failed. Review the results below.':'Run could not complete. Check delivery and pipeline details.','failed');}
 else banner(report?.overall_status==='passed'?'Tests passed. Finishing report and deployment.':'Tests are running');
 $('controls').hidden=!unlocked;
 lock(pending||data.busy||!done);
 }catch(e){$('connection').textContent='Connection interrupted';$('action-message').textContent=e.message;lock(false);}finally{polling=false;}}
async function perform(action){pending=true;lock(true);$('action-message').textContent='Sending request to GitHub';try{
 const previous=await request('status');lastRun=String(previous.run?.id||'');
 const result=await request('action',{method:'POST',body:JSON.stringify({action})});$('action-message').textContent=result.message;waitingRun=lastRun;selected='';clearResults();
 }catch(e){banner('Could not start the run.','failed');$('action-message').textContent=e.message;lock(false);}finally{pending=false;refresh();}}
$('runs').addEventListener('change',()=>{selected=$('runs').value;refresh();});
for(const button of document.querySelectorAll('[data-action]'))button.addEventListener('click',()=>{const action=button.dataset.action;if(action!=='run'&&armed!==action){armed=action;$('action-message').textContent=action==='defect'?'Click Push Defect again to confirm the change to main.':'Click Fix Defect and Push again to confirm the correction.';return;}armed='';perform(action);});
export async function startSubmissionChecks(submission){
 if(pending)return;
 lock(true);armed='';
 $('ci-dashboard').hidden=false;$('saved').hidden=true;$('submission-context').textContent=`${submission.title} · ${submission.name} · ${submission.registration}`;$('controls').hidden=true;unlocked=false;clearResults();
 try{session=(await request('session')).session;active=true;await perform('run');if(!timer)timer=setInterval(refresh,6000);}catch(e){$('local-help').hidden=false;banner('Start the local controller, then click Upload again.','failed');$('action-message').textContent='If your browser asks for local network access, allow it for this portal.';lock(false);}
}
document.querySelector('a[href="#saved"]')?.addEventListener('click',()=>{$('saved').hidden=false;});
