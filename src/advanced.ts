import {body,first,list,execute,uid,now,json,required,fail,limit,type Env} from './core';
type Sample={text:string,label:string};
export function profileDataset(records:Sample[]){
 const labels:Record<string,number>={},seen=new Set<string>();let duplicates=0;
 for(const row of records){labels[row.label]=(labels[row.label]||0)+1;const key=row.text.trim().toLowerCase();if(seen.has(key))duplicates++;seen.add(key)}
 const warnings:string[]=[];if(duplicates)warnings.push(`${duplicates} duplicate text examples; inspect train-test contamination risk`);
 for(const [label,num] of Object.entries(labels))if(num<2)warnings.push(`Label ${label} has fewer than two examples`);
 if(Object.keys(labels).length<2)warnings.push('Classification requires at least two labels');
 return {sample_count:records.length,distinct_count:seen.size,duplicate_count:duplicates,label_distribution:labels,warnings};
}
export async function advancedApi(req:Request,env:Env,url:URL):Promise<Response|null>{
 const p=url.pathname,m=req.method;
 if(p==='/api/dataset-profiles'&&m==='GET')return json({items:await list(env,'SELECT p.id,d.name dataset,p.sample_count,p.distinct_count,p.duplicate_count,p.fingerprint,p.warnings,p.created_at FROM dataset_profiling p JOIN datasets d ON d.id=p.dataset_id ORDER BY p.created_at DESC LIMIT ?',limit(url))});
 const profile=p.match(/^\/api\/datasets\/([^/]+)\/profile$/);
 if(profile&&m==='POST'){
  const dataset=await first<{id:string,records:string}>(env,'SELECT * FROM datasets WHERE id=?',profile[1]);if(!dataset)fail(404,'Dataset not found');
  const rows=JSON.parse(dataset.records) as Sample[];const result=profileDataset(rows);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(dataset.records));const fingerprint=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
  const id=uid();await execute(env,'INSERT INTO dataset_profiling VALUES(?,?,?,?,?,?,?,?,?)',id,dataset.id,fingerprint,result.sample_count,result.distinct_count,result.duplicate_count,JSON.stringify(result.label_distribution),JSON.stringify(result.warnings),now());
  return json({id,dataset_id:dataset.id,fingerprint,...result},201);
 }
 if(p==='/api/promotions'&&m==='GET')return json({items:await list(env,'SELECT p.*,m.name model FROM model_promotions p JOIN models m ON m.id=p.model_id ORDER BY p.created_at DESC LIMIT ?',limit(url))});
 const promote=p.match(/^\/api\/models\/([^/]+)\/promote$/);
 if(promote&&m==='POST'){
  const b=await body(req),to_stage=required(b.stage,'stage');if(!['staging','production','archived'].includes(to_stage))fail(400,'Invalid target stage');
  const model=await first<{id:string,stage:string,experiment_run_id:string}>(env,'SELECT * FROM models WHERE id=?',promote[1]);if(!model)fail(404,'Model not found');
  const run=await first<{accuracy:number}>(env,'SELECT accuracy FROM experiment_runs WHERE id=?',model.experiment_run_id);if(!run)fail(404,'Experiment run not found');
  if(to_stage==='production'&&(model.stage!=='staging'||run.accuracy<0.8))fail(409,'Production promotion requires staging and measured held-out accuracy >= 0.80');
  if(to_stage==='staging'&&model.stage!=='candidate')fail(409,'Only candidate models may enter staging');
  if(to_stage===model.stage)fail(409,'Model already in target stage');
  const reason=required(b.reason,'reason',1000);
  const changed=await env.DB.prepare('UPDATE models SET stage=? WHERE id=? AND stage=?').bind(to_stage,model.id,model.stage).run();if(!changed.meta?.changes)fail(409,'Concurrent model stage transition');
  await execute(env,'INSERT INTO model_promotions VALUES(?,?,?,?,?,?,?)',uid(),model.id,model.stage,to_stage,reason,run.accuracy,now());return json({model_id:model.id,from_stage:model.stage,stage:to_stage,measured_accuracy:run.accuracy});
 }
 return null;
}
