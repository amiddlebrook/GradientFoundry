import {body,first,list,execute,json,required,fail,now,uid,type Env} from './core';
type RecordRow={id:string;experiment_id:string;accuracy:number;precision_score:number;recall_score:number;experiment:string;dataset_id:string};
export function compareRuns(a:RecordRow,b:RecordRow){return {accuracy_delta:Number((b.accuracy-a.accuracy).toFixed(6)),precision_delta:Number((b.precision_score-a.precision_score).toFixed(6)),recall_delta:Number((b.recall_score-a.recall_score).toFixed(6)),same_dataset:a.dataset_id===b.dataset_id};}
export async function decisionApi(req:Request,env:Env,url:URL):Promise<Response|null>{
 const p=url.pathname;
 if(p==='/api/decision/reviews'&&req.method==='GET'){
  const [runs,reviews]=await Promise.all([list<RecordRow>(env,'SELECT r.id,r.experiment_id,r.accuracy,r.precision_score,r.recall_score,e.name experiment,e.dataset_id FROM experiment_runs r JOIN experiments e ON e.id=r.experiment_id ORDER BY r.created_at DESC LIMIT 100'),list(env,'SELECT r.*,a.accuracy baseline_accuracy,b.accuracy challenger_accuracy FROM experiment_reviews r JOIN experiment_runs a ON a.id=r.baseline_id JOIN experiment_runs b ON b.id=r.challenger_id ORDER BY r.created_at DESC LIMIT 100')]);
  return json({runs,reviews,note:'Comparisons use recorded evaluation metrics only. Equal datasets do not prove identical data splits or statistically significant improvement.'});
 }
 if(p==='/api/decision/reviews'&&req.method==='POST'){
  const b=await body(req,10000);const firstId=required(b.baseline_id,'baseline_id',100),secondId=required(b.challenger_id,'challenger_id',100);if(firstId===secondId)fail(400,'Choose two different runs');
  const sql='SELECT r.id,r.experiment_id,r.accuracy,r.precision_score,r.recall_score,e.name experiment,e.dataset_id FROM experiment_runs r JOIN experiments e ON e.id=r.experiment_id WHERE r.id=?';
  const a=await first<RecordRow>(env,sql,firstId),c=await first<RecordRow>(env,sql,secondId);if(!a||!c)fail(404,'Experiment run not found');if(a.dataset_id!==c.dataset_id)fail(409,'Comparisons require the same dataset; cross-dataset metrics are not directly comparable');
  const reason=required(b.rationale,'rationale',1800);const diff=compareRuns(a,c),id=uid();await execute(env,'INSERT INTO experiment_reviews VALUES(?,?,?,?,?,?,?)',id,firstId,secondId,reason,JSON.stringify(diff),now(),a.dataset_id);return json({id,...diff},201);
 }
 if(p.startsWith('/api/decision/'))fail(404,'Unknown review endpoint');return null;
}
