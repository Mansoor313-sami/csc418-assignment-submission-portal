import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {saveSubmission,listSubmissions,validateSubmission} from '../web/portal.mjs';
const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
const valid={name:'Mansoor Ahmad',registration:'FA23-BSE-037',title:'DevOps Lab Midterm',url:'https://github.com/example/assignment'};
const cases=[
 ['Complete details and valid URL are saved and displayed',()=>{const store=memory();const result=saveSubmission(valid,store);assert.equal(result.ok,true);const rows=listSubmissions(store);assert.equal(rows.length,1);assert.equal(rows[0].registration,valid.registration);assert.equal(rows[0].url,valid.url);}],
 ['Missing registration number is rejected with a message',()=>{const store=memory();const result=saveSubmission({...valid,registration:''},store);assert.equal(result.ok,false);assert.match(result.errors.registration,/required/i);assert.equal(listSubmissions(store).length,0);}],
 ['Invalid submission URL is rejected and not saved',()=>{const store=memory();const result=saveSubmission({...valid,url:'not-a-valid-url'},store);assert.equal(result.ok,false);assert.match(result.errors.url,/valid/i);assert.equal(listSubmissions(store).length,0);}],
 ['All required fields reject blank and whitespace values',()=>{for(const field of Object.keys(valid)){assert.ok(validateSubmission({...valid,[field]:'   '})[field]);}}],
 ['Unsafe URL protocols are rejected',()=>{for(const url of ['javascript:alert(1)','file:///C:/secret','ftp://example.com/file','https://']){assert.ok(validateSubmission({...valid,url}).url);}}],
 ['Multiple submissions survive a fresh read in latest first order',()=>{const store=memory();saveSubmission(valid,store);saveSubmission({...valid,title:'Second assignment'},store);const rows=listSubmissions(store);assert.equal(rows.length,2);assert.equal(rows[0].title,'Second assignment');assert.equal(rows[1].title,valid.title);}],
 ['Invalid attempt does not change an existing saved record',()=>{const store=memory();saveSubmission(valid,store);const before=JSON.stringify(listSubmissions(store));saveSubmission({...valid,url:'broken'},store);assert.equal(JSON.stringify(listSubmissions(store)),before);}],
 ['Valid input is trimmed before saving',()=>{const store=memory();saveSubmission({...valid,name:'  Mansoor Ahmad  '},store);assert.equal(listSubmissions(store)[0].name,'Mansoor Ahmad');}]
];
const tests=[];
for(const [name,execute] of cases){const start=performance.now();try{await execute();tests.push({name,result:'passed',failure_message:null,duration_ms:Math.round(performance.now()-start)});console.log('PASS '+name);}catch(error){tests.push({name,result:'failed',failure_message:error.message,duration_ms:Math.round(performance.now()-start)});console.error('FAIL '+name+'\n'+error.message);}}
function git(...args){try{return execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{return 'local';}}
const failed=tests.filter(t=>t.result==='failed').length;
const report={repository:process.env.GITHUB_REPOSITORY||'local/csc418-assignment-portal',branch:process.env.GITHUB_REF_NAME||git('branch','--show-current'),commit_sha:process.env.GITHUB_SHA||git('rev-parse','HEAD'),pipeline_run_id:process.env.GITHUB_RUN_ID||`local-${Date.now()}`,run_attempt:process.env.GITHUB_RUN_ATTEMPT||'1',execution_timestamp:new Date().toISOString(),tests,total:tests.length,passed:tests.length-failed,failed,overall_status:failed?'failed':'passed'};
await mkdir('reports',{recursive:true});await writeFile('reports/test-report.json',JSON.stringify(report,null,2)+'\n');console.log(`\n${report.overall_status.toUpperCase()}: ${report.passed}/${report.total} tests passed. JSON: reports/test-report.json`);process.exitCode=failed?1:0;
