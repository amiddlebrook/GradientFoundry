import {crossValidationApi} from './cross-validation';
import {domainLabApi} from './domain-lab';
import {agentApi} from './agent';
import {decisionApi} from './decision';
import {studioApi} from './studio';
import { advancedApi } from './advanced';
import { withApi, body, first, list, execute, uid, now, json, required, oneOf, fail, limit, count, type Env } from './core';
type Dataset={id:string;name:string;description:string;records:string;created_at:string};
type Experiment={id:string;name:string;dataset_id:string;algorithm:string;hyperparameters:string;status:string};
async function sha256(text:string):Promise<string>{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}

export function validateRecords(items:unknown):{text:string;label:string}[]{
 if(!Array.isArray(items)||items.length<4||items.length>500)fail(400,'Provide 4–500 labeled examples');
 const records=items.map((row:any)=>({text:required(row?.text,'record text',1000),label:required(row?.label,'record label',60)}));
 if(new Set(records.map(r=>r.label)).size<2)fail(400,'At least two distinct labels required');return records;
}
export async function api(req:Request,env:Env,url:URL):Promise<Response>{
 const p=url.pathname,m=req.method;
  const agent=await agentApi(req,env,url); if(agent) return agent;
  const decision=await decisionApi(req,env,url); if(decision) return decision;
  const studio=await studioApi(req,env,url); if(studio) return studio;
  const enhanced=await advancedApi(req,env,url); if(enhanced) return enhanced;
  const cv=await crossValidationApi(req,env,url); if(cv) return cv;
  const lab=await domainLabApi(req,env,url); if(lab) return lab;
 if(p==='/api/overview'&&m==='GET') {const [d,e,r,models]=await Promise.all(['datasets','experiments','experiment_runs','models'].map(t=>first<{n:number}>(env,`SELECT count(*) n FROM ${t}`)));return json({metrics:[{label:'Datasets',value:count(d)},{label:'Experiments',value:count(e)},{label:'Training runs',value:count(r)},{label:'Registered models',value:count(models)}],recent:await list(env,'SELECT r.id,e.name experiment,r.accuracy,r.seed,r.created_at FROM experiment_runs r JOIN experiments e ON e.id=r.experiment_id ORDER BY r.created_at DESC LIMIT 8')})}
 if(p==='/api/datasets'&&m==='GET')return json({items:(await list<Dataset>(env,'SELECT * FROM datasets ORDER BY created_at DESC LIMIT ?',limit(url))).map(d=>({...d,record_count:JSON.parse(d.records).length,records:undefined}))});
 if(p==='/api/datasets'&&m==='POST'){const b=await body(req),id=uid(),recs=validateRecords(b.records);await execute(env,'INSERT INTO datasets VALUES(?,?,?,?,?)',id,required(b.name,'name'),String(b.description||'').slice(0,2000),JSON.stringify(recs),now());return json({id,record_count:recs.length},201)}
 const data=p.match(/^\/api\/datasets\/([^/]+)$/);if(data&&m==='GET'){const d=await first<Dataset>(env,'SELECT * FROM datasets WHERE id=?',data[1]);if(!d)fail(404,'Dataset not found');return json({...d,records:JSON.parse(d.records)})}
 if(p==='/api/experiments'&&m==='GET')return json({items:await list(env,'SELECT e.*,d.name dataset FROM experiments e JOIN datasets d ON d.id=e.dataset_id ORDER BY e.created_at DESC LIMIT ?',limit(url))});
 if(p==='/api/experiments'&&m==='POST'){const b=await body(req),d=await first<Dataset>(env,'SELECT * FROM datasets WHERE id=?',required(b.dataset_id,'dataset_id'));if(!d)fail(404,'Dataset not found');const id=uid(),ts=now(),h=b.hyperparameters&&typeof b.hyperparameters==='object'?b.hyperparameters:{};await execute(env,'INSERT INTO experiments VALUES(?,?,?,?,?,?,?,?)',id,d.id,required(b.name,'name'),oneOf(b.algorithm||'hashed_softmax_sgd',['hashed_softmax_sgd'],'algorithm'),JSON.stringify(h).slice(0,2000),'defined',ts,ts);return json({id},201)}
 const exportId=p.match(/^\/api\/experiments\/([^/]+)\/export$/);if(exportId&&m==='GET'){const e=await first<Experiment>(env,'SELECT * FROM experiments WHERE id=?',exportId[1]);if(!e)fail(404,'Experiment not found');const d=await first<Dataset>(env,'SELECT * FROM datasets WHERE id=?',e.dataset_id);if(!d)fail(404,'Dataset not found');return json({experiment:{id:e.id,name:e.name,algorithm:e.algorithm,hyperparameters:JSON.parse(e.hyperparameters)},dataset:{id:d.id,name:d.name,records:JSON.parse(d.records)}})}
 const importId=p.match(/^\/api\/experiments\/([^/]+)\/runs$/);if(importId&&m==='POST'){const b=await body(req),e=await first<Experiment>(env,'SELECT * FROM experiments WHERE id=?',importId[1]);if(!e)fail(404,'Experiment not found');const id=uid();const acc=Number(b.accuracy),prec=Number(b.precision),rec=Number(b.recall);for(const [label,n] of [['accuracy',acc],['precision',prec],['recall',rec]] as const)if(!Number.isFinite(n)||n<0||n>1)fail(400,`${label} must be between 0 and 1`);if(!Array.isArray(b.history)||b.history.length>500)fail(400,'History must contain at most 500 points');const dataset=await first<Dataset>(env,'SELECT * FROM datasets WHERE id=?',e.dataset_id);if(!dataset)fail(404,'Dataset not found');
 const seed=Math.floor(Number(b.seed)||42),history=JSON.stringify(b.history).slice(0,30000),weights=JSON.stringify(b.weights||{}).slice(0,40000),notes=String(b.notes||'').slice(0,1000),ts=now();
 const datasetHash=await sha256(dataset.records),metricHash=await sha256(JSON.stringify({experiment_id:e.id,seed,accuracy:acc,precision:prec,recall:rec,history,weights,notes}));
 await execute(env,'INSERT INTO experiment_runs VALUES(?,?,?,?,?,?,?,?,?,?)',id,e.id,seed,acc,prec,rec,history,weights,notes,ts);
 await execute(env,'INSERT INTO run_lineage(run_id,dataset_sha256,metrics_sha256,source,created_at) VALUES(?,?,?,?,?)',id,datasetHash,metricHash,'user-reported',ts);
 await execute(env,'UPDATE experiments SET status=?,updated_at=? WHERE id=?','evaluated',now(),e.id);return json({id},201)}
 const lineagePath=p.match(/^\/api\/runs\/([^/]+)\/lineage$/);
 if(lineagePath&&m==='GET'){
  const run=await first<{id:string;dataset_id:string;records:string;name:string}>(env,'SELECT r.id,d.id dataset_id,d.records,e.name FROM experiment_runs r JOIN experiments e ON e.id=r.experiment_id JOIN datasets d ON d.id=e.dataset_id WHERE r.id=?',lineagePath[1]);
  if(!run)fail(404,'Run not found');
  const lineage=await first<{dataset_sha256:string;metrics_sha256:string;source:string;created_at:string}>(env,'SELECT * FROM run_lineage WHERE run_id=?',run.id);
  const current=await sha256(run.records);
  return json({run_id:run.id,dataset_id:run.dataset_id,experiment:run.name,source:lineage?.source||'unverified legacy import',dataset_sha256:lineage?.dataset_sha256||null,metrics_sha256:lineage?.metrics_sha256||null,unchanged:!!lineage&&lineage.dataset_sha256===current,attested_by_trainer:false,note:'SHA-256 detects dataset/payload drift; server-side fingerprints do not prove an external training run occurred.'});
 }
 if(p==='/api/runs'&&m==='GET')return json({items:await list(env,'SELECT r.*,e.name experiment FROM experiment_runs r JOIN experiments e ON e.id=r.experiment_id ORDER BY r.created_at DESC LIMIT ?',limit(url))});
 if(p==='/api/models'&&m==='GET')return json({items:await list(env,'SELECT m.*,e.name experiment,r.accuracy FROM models m JOIN experiment_runs r ON r.id=m.experiment_run_id JOIN experiments e ON e.id=r.experiment_id ORDER BY m.created_at DESC LIMIT ?',limit(url))});
 if(p==='/api/models'&&m==='POST'){const b=await body(req),r=await first<{id:string}>(env,'SELECT id FROM experiment_runs WHERE id=?',required(b.experiment_run_id,'experiment_run_id'));if(!r)fail(404,'Run not found');
  const dataset=await first<Dataset>(env,'SELECT d.* FROM datasets d JOIN experiments e ON e.dataset_id=d.id JOIN experiment_runs x ON x.experiment_id=e.id WHERE x.id=?',r.id);
  if(!dataset)fail(404,'Training dataset not found');
  const {datasetQuality}=await import('./domain-lab');const quality=datasetQuality(JSON.parse(dataset.records));
  if(quality.conflicts.length)fail(409,'Model registration blocked: identical examples have contradictory labels');
  const lineage=await first<{dataset_sha256:string;metrics_sha256:string}>(env,'SELECT dataset_sha256,metrics_sha256 FROM run_lineage WHERE run_id=?',r.id);
  if(!lineage||lineage.dataset_sha256!==await sha256(dataset.records))fail(409,'Model registration blocked: missing or mismatched training dataset fingerprint');
  const id=uid();await execute(env,'INSERT INTO models VALUES(?,?,?,?,?)',id,r.id,required(b.name,'name'),oneOf(b.stage||'candidate',['candidate'],'stage'),now());return json({id},201)}
 const promote=p.match(/^\/api\/models\/([^/]+)\/stage$/);if(promote&&m==='POST')fail(410,'Use /api/models/:id/promote with a recorded reason and governance checks');
 if(p==='/api/seed'&&m==='POST'){if(count(await first<{n:number}>(env,'SELECT count(*) n FROM datasets')))return json({seeded:false});const id=uid(),e=uid(),t=now();const examples=[['refund request','refund'],['customer needs money back','refund'],['return the damaged item','refund'],['reverse my charge','refund'],['need invoice copy','billing'],['send me a receipt','billing'],['invoice number missing','billing'],['billing information incorrect','billing'],['cannot log into account','support'],['password reset not working','support'],['the application crashes','support'],['error while signing in','support']].map(([text,label])=>({text,label}));await execute(env,'INSERT INTO datasets VALUES(?,?,?,?,?)',id,'Support intent baseline','Small public synthetic intent-classification dataset',JSON.stringify(examples),t);await execute(env,'INSERT INTO experiments VALUES(?,?,?,?,?,?,?,?)',e,id,'Baseline hashed softmax','hashed_softmax_sgd',JSON.stringify({epochs:40,learning_rate:.15,buckets:128}),'defined',t,t);return json({seeded:true,experiment_id:e})}
 return fail(404,'Unknown API route');
}
export default {
 fetch(req:Request,env:Env){return withApi(req,env,api)},
 async scheduled(controller:{cron:string},env:Env):Promise<void> {
  // Scheduled events are Cloudflare-internal. Never expose this action through HTTP.
  if(controller.cron!=='0 4 * * *')throw new Error('Unknown maintenance schedule');
  const {cleanupWriteQuota}=await import('./write-quota');
  const removed=await cleanupWriteQuota(env);
  const {cleanupBudget}=await import('./free-tier');
  await cleanupBudget(env);
  await execute(env,`INSERT INTO maintenance_status(job,ran_at,rows_pruned) VALUES(?,?,?)
  ON CONFLICT(job) DO UPDATE SET ran_at=excluded.ran_at,rows_pruned=excluded.rows_pruned`,
  'write-quota',now(),removed);
 }
};
