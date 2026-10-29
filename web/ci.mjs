const $=id=>document.getElementById(id);let session='',selected='',pending=false,polling=false,lastMail='',lastRun='',waitingRun='';
const local=['127.0.0.1','localhost'].includes(location.hostname);
async function request(path,options={}){const r=await fetch('/api/'+path,{...options,headers:{'Content-Type':'application/json','X-Controller-Session':session,...options.headers}});const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');return data;}
function status(id,text,kind=''){const el=$(id);el.textContent=text;el.className=kind;}
function lock(value){document.querySelectorAll('[data-action]').forEach(b=>b.disabled=value);}
async function refresh(){if(polling)return;polling=true;try{
 const data=await request('status'+(selected?'?run='+encodeURIComponent(selected):''));$('connection').textContent='● Controller connected';
 if(waitingRun&&String(data.run?.id)===waitingRun){$('pipeline').textContent='Starting…';return;}waitingRun='';lastRun=String(data.run?.id||'');
 $('runs').replaceChildren(...data.runs.map(r=>{const o=document.createElement('option');o.value=r.id;o.textContent=`#${r.id} · ${r.name} · ${r.conclusion||r.status}`;return o;}));
 if(data.run){$('runs').value=data.run.id;$('run-link').href=data.run.html_url;$('pipeline').textContent=data.run.conclusion||data.run.status;$('commit').textContent=`Commit ${data.run.head_sha.slice(0,8)} · ${data.run.event==='push'?'Push-triggered run':'Manual test run'} · Attempt ${data.run.run_attempt}`;}
 const report=data.report;for(const key of ['total','passed','failed'])$(key).textContent=report?report[key]:'—';
 status('report-status',report?'Local Report Received ✅':'○ Local report: waiting',report?'success':'');
 const email=data.jobs.flatMap(j=>j.steps||[]).find(s=>s.name==='Email completed report');
 const sent=email?.conclusion==='success';status('email-status',sent?'Mail Sent ✅':email?.conclusion==='failure'?'Email failed ❌':email?.status==='in_progress'?'Sending email…':'○ Email: waiting',sent?'success':email?.conclusion==='failure'?'failed':'');
 const mailKey=sent?`${data.run.id}-${data.run.run_attempt}`:'';if(mailKey&&mailKey!==lastMail){$('email-status').classList.add('mail-pop');lastMail=mailKey;}
 const deploy=data.jobs.find(j=>j.name==='deploy');status('deploy-status',deploy?.conclusion==='success'?'Deployed ✅':deploy?.conclusion==='skipped'?'Deployment skipped':deploy?.conclusion==='failure'?'Deployment failed ❌':deploy?.status==='in_progress'?'Deploying…':'○ Deployment: waiting',deploy?.conclusion==='success'?'success':'');
 if(report){$('tests').replaceChildren(...report.tests.map(t=>{const row=document.createElement('tr');for(const value of [t.name,t.result==='passed'?'PASS ✅':'FAIL ❌',t.failure_message||'—']){const td=document.createElement('td');td.textContent=value;row.append(td);}return row;}));}else{$('tests').innerHTML='<tr><td colspan="3">Waiting for this run’s report from the local receiver.</td></tr>';}
 lock(pending||data.busy);
 }catch(e){$('connection').textContent='Connection interrupted';$('action-message').textContent=e.message;}finally{polling=false;}}
$('runs').addEventListener('change',()=>{selected=$('runs').value;refresh();});
for(const button of document.querySelectorAll('[data-action]'))button.addEventListener('click',async()=>{
 const action=button.dataset.action;
 if(action!=='run'&&!confirm(action==='defect'?'Push a real registration-validation defect to main? Tests should fail and deployment will be skipped.':'Push the validation fix to main?'))return;
 pending=true;lock(true);$('action-message').textContent='Sending request to GitHub…';
 try{const result=await request('action',{method:'POST',body:JSON.stringify({action})});$('action-message').textContent=result.message;waitingRun=lastRun;selected='';$('pipeline').textContent='Starting…';for(const key of ['total','passed','failed'])$(key).textContent='—';status('report-status','○ Local report: waiting');status('email-status','○ Email: waiting');status('deploy-status','○ Deployment: waiting');$('tests').innerHTML='<tr><td colspan="3">Waiting for the new run…</td></tr>';}catch(e){$('action-message').textContent=e.message;}finally{pending=false;lock(false);refresh();}
});
if(!local){$('local-help').hidden=false;$('controls').hidden=true;$('connection').textContent='Local controller needed';$('runs').disabled=true;}
else{try{session=(await request('session')).session;await refresh();setInterval(refresh,6000);}catch{$('connection').textContent='Start the local controller';$('local-help').hidden=false;lock(true);}}
