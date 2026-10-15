import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const app=require('./.compiled/index.js');
function fixture(){
 const db=new DatabaseSync(':memory:');
 for(const name of readdirSync('migrations').filter(s=>s.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+name,'utf8'));
 let aiCalls=0;
 const env={ADMIN_TOKEN:'phase26-fixture-root-secret',FREE_AI_ENABLED:'false',DB:{prepare(sql){let args=[];return{bind(...v){args=v;return this},async first(){return db.prepare(sql).get(...args)??null},async all(){return{results:db.prepare(sql).all(...args)}},async run(){const x=db.prepare(sql).run(...args);return{meta:{changes:x.changes}}}}}},AI:{async run(){aiCalls++;return{response:'AI should not be invoked'}}}};
 return {db,env,get aiCalls(){return aiCalls},close(){db.close()}};
}
async function call(f,path,payload,method){const url=new URL('http://localhost:8787'+path);const req=new Request(url,{method:method||(payload===undefined?'GET':'POST'),headers:payload===undefined?{}:{'Content-Type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload)});return app.api(req,f.env,url).then(async res=>({status:res.status,data:await res.json()}));}
async function rejects(f,path,payload,status,method){await assert.rejects(()=>call(f,path,payload,method),e=>e.status===status)}
test('cross-validation is reproducible and never splits exact duplicate text groups',async()=>{
 const f=fixture();try{
 const rows=[{text:'hello',label:'a'},{text:'  HELLO ',label:'a'},{text:'world',label:'b'},{text:'agent',label:'a'},{text:'server',label:'b'},{text:'routing',label:'a'},{text:'ops',label:'b'},{text:'monitor',label:'a'}];
 const d=(await call(f,'/api/datasets',{name:'Cross validation data',records:rows})).data;
 const a=(await call(f,`/api/datasets/${d.id}/cross-validation?folds=3&seed=11`)).data;
 const b=(await call(f,`/api/datasets/${d.id}/cross-validation?folds=3&seed=11`)).data;
 assert.deepEqual(a,b);assert.equal(a.groups,7);assert.equal(a.duplicates,1);
 assert.equal(a.partitions.reduce((sum,x)=>sum+x.records,0),rows.length);
 assert.equal(a.leakage_by_exact_duplicate,0);assert.equal(a.training_executed,false);assert.equal(f.aiCalls,0);
 await rejects(f,`/api/datasets/${d.id}/cross-validation?folds=100`,undefined,400,'GET');
 }finally{f.close()}
});
