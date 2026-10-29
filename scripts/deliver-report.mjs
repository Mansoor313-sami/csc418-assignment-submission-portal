import {readFile} from 'node:fs/promises';
const endpoint=process.env.REPORT_RECEIVER_URL;
const token=process.env.REPORT_TOKEN;
if(!endpoint||!token)throw new Error('REPORT_RECEIVER_URL and REPORT_TOKEN are required.');
const body=await readFile('reports/test-report.json','utf8');
for(let attempt=1;attempt<=4;attempt++){
  try{const response=await fetch(endpoint.replace(/\/$/,'')+'/reports',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body,signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`Receiver returned HTTP ${response.status}`);const result=await response.json();if(!result.saved)throw new Error('Receiver did not acknowledge saving');console.log('Local receiver saved test-report.json for run '+result.run_id);break;}
  catch(error){if(attempt===4)throw error;console.error(`Delivery attempt ${attempt} failed: ${error.message}`);await new Promise(resolve=>setTimeout(resolve,attempt*2000));}
}
