import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
const app=createRequire(import.meta.url)('./.compiled/index.js');
function fixture(){const db=new DatabaseSync(':memory:');for(const file of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+file,'utf8'));const env={DB:{prepare(sql){let p=[];return{bind(...args){p=args;return this},async first(){return db.prepare(sql).get(...p)??null},async all(){return{results:db.prepare(sql).all(...p)}},async run(){const r=db.prepare(sql).run(...p);return{meta:{changes:r.changes}}}}}}};return {db,env}}
async function call(env,path,data){const url=new URL('http://localhost:8787'+path);const request=new Request(url,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});return app.api(request,env,url).then(async x=>({status:x.status,data:await x.json()}));}
test('recorded metrics are bound to an immutable dataset fingerprint, without falsely claiming trainer attestation',async()=>{const {db,env}=fixture();try{
 const dataset=(await call(env,'/api/datasets',{name:'Training revision A',records:[{text:'a',label:'yes'},{text:'b',label:'no'},{text:'c',label:'yes'},{text:'d',label:'no'}]})).data;
 const exp=(await call(env,'/api/experiments',{name:'Trial',dataset_id:dataset.id})).data;
 const run=(await call(env,`/api/experiments/${exp.id}/runs`,{accuracy:.65,precision:.7,recall:.8,history:[]})).data;
 const l=(await call(env,`/api/runs/${run.id}/lineage`)).data;
 assert.equal(l.unchanged,true);assert.equal(l.attested_by_trainer,false);assert.equal(l.dataset_sha256.length,64);assert.equal(l.metrics_sha256.length,64);
 assert.throws(()=>db.prepare('UPDATE datasets SET records=? WHERE id=?').run('[]',dataset.id),/immutable/);
 assert.throws(()=>db.prepare('UPDATE experiment_runs SET accuracy=? WHERE id=?').run(.99,run.id),/immutable/);
 const model=await call(env,'/api/models',{name:'Candidate',experiment_run_id:run.id});assert.equal(model.status,201);
 }finally{db.close()}});
test('missing run lineage fails closed for candidate registration',async()=>{const {db,env}=fixture();try{
 const dataset=(await call(env,'/api/datasets',{name:'Legacy trial',records:[{text:'a',label:'yes'},{text:'b',label:'no'},{text:'c',label:'yes'},{text:'d',label:'no'}]})).data;
 const exp=(await call(env,'/api/experiments',{name:'Legacy imported run',dataset_id:dataset.id})).data;
 const run=(await call(env,`/api/experiments/${exp.id}/runs`,{accuracy:.5,precision:.5,recall:.5,history:[]})).data;
 db.prepare('DELETE FROM run_lineage WHERE run_id=?').run(run.id);
 await assert.rejects(()=>call(env,'/api/models',{name:'Unverified',experiment_run_id:run.id}),e=>e.status===409);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM models').get().n,0);
 }finally{db.close()}});
