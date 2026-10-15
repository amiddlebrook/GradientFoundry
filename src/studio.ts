import {list,json,type Env} from './core';
export async function studioApi(req:Request,env:Env,url:URL):Promise<Response|null>{
 if(url.pathname!=='/api/studio/lineage')return null;
 if(req.method!=='GET')return Response.json({error:'Method not allowed'},{status:405});
 const [datasets,experiments,runs,models,profiles]=await Promise.all([
  list<{id:string;name:string;description:string;created_at:string}>(env,'SELECT id,name,description,created_at FROM datasets ORDER BY created_at DESC LIMIT 60'),
  list<{id:string;dataset_id:string;name:string;algorithm:string;status:string;created_at:string}>(env,'SELECT id,dataset_id,name,algorithm,status,created_at FROM experiments ORDER BY created_at DESC LIMIT 140'),
  list<{id:string;experiment_id:string;seed:number;accuracy:number;precision_score:number;recall_score:number;created_at:string}>(env,'SELECT id,experiment_id,seed,accuracy,precision_score,recall_score,created_at FROM experiment_runs ORDER BY created_at DESC LIMIT 250'),
  list<{id:string;experiment_run_id:string;name:string;stage:string;created_at:string}>(env,'SELECT id,experiment_run_id,name,stage,created_at FROM models ORDER BY created_at DESC LIMIT 180'),
  list<{dataset_id:string;sample_count:number;duplicate_count:number;fingerprint:string;created_at:string}>(env,'SELECT dataset_id,sample_count,duplicate_count,fingerprint,created_at FROM dataset_profiling ORDER BY created_at DESC LIMIT 120')
 ]);
 const prof=new Map<string,typeof profiles[number]>();for(const x of profiles)if(!prof.has(x.dataset_id))prof.set(x.dataset_id,x);
 return json({datasets:datasets.map(x=>({...x,profile:prof.get(x.id)||null})),experiments,runs,models,limits:{datasets:60,experiments:140,runs:250,models:180},note:'A run is a recorded metric artifact; importing metrics does not imply training took place on Cloudflare. Older records may be truncated.'});
}
