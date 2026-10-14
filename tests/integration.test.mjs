import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const require=createRequire(import.meta.url);
const app=name=>require(resolve(`tests/.compiled/index.js`));
function environment(name){
  const sql=new DatabaseSync(':memory:');for(const file of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('migrations/'+file,'utf8'));
  return {DB:{prepare(query){let args=[];return {bind(...v){args=v;return this}, async all(){return {results:sql.prepare(query).all(...args)}},async first(){return sql.prepare(query).get(...args)??null},async run(){const out=sql.prepare(query).run(...args);return {meta:{changes:out.changes}}}}}},
    AI:{async run(){return {response:'Synthetic test adapter answer. No live AI requests.'}}},stop(){sql.close()}};
}
function req(path,body){return new Request('http://localhost:8787'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
async function call(name,env,path,data,method){const request=new Request('http://localhost:8787'+path,{method:method||((data===undefined)?'GET':'POST'),headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const response=await app(name).api(request,env,new URL(request.url));if(response.status<200||response.status>=300)throw new Error(`${name} ${path} HTTP ${response.status}: ${await response.text()}`);return response.json()}

test('GradientFoundry: dataset + experiment + run + model registry end-to-end',async()=>{
 const env=environment('gradientfoundry');try{
  const seed=await call('gradientfoundry',env,'/api/seed',{});
  const exported=await call('gradientfoundry',env,`/api/experiments/${seed.experiment_id}/export`);
  assert.equal(exported.dataset.records.length,12);
  const run=await call('gradientfoundry',env,`/api/experiments/${seed.experiment_id}/runs`,{seed:42,accuracy:.66,precision:.7,recall:.61,history:[{epoch:1,train_loss:.8}],weights:{},notes:'Synthetic integration test only'});
  const model=await call('gradientfoundry',env,'/api/models',{experiment_run_id:run.id,name:'Demo',stage:'candidate'});
  await call('gradientfoundry',env,`/api/models/${model.id}/promote`,{stage:'staging',reason:'Manual governance review'});
  const listed=await call('gradientfoundry',env,'/api/models');assert.equal(listed.items[0].stage,'staging');
 }finally{env.stop()}
});

