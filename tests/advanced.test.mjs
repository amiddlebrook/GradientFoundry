import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const app=require('./.compiled/index.js');
const advanced=require('./.compiled/advanced.js');
function env(){
 const sql=new DatabaseSync(':memory:');
 for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('migrations/'+f,'utf8'));
 return { sql,DB:{prepare(query){let args=[];return {bind(...x){args=x;return this},async all(){return {results:sql.prepare(query).all(...args)}},async first(){return sql.prepare(query).get(...args)??null},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:r.changes}}}}}},AI:{async run(){return {response:'Fixture test response'}}},stop(){sql.close()}};
}
async function call(e,path,data,method){const request=new Request('http://localhost:8787'+path,{method:method||(data===undefined?'GET':'POST'),headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const response=await app.api(request,e,new URL(request.url));assert.ok(response.ok,`${path}: HTTP ${response.status}`);return response.json()}
async function rejection(e,path,data,status=400){const request=new Request('http://localhost:8787'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});await assert.rejects(()=>app.api(request,e,new URL(request.url)),err=>err.status===status)}
test('dataset profiling and governed promotions',async()=>{
 const e=env();try{const d=await call(e,'/api/datasets',{name:'Labeled records',records:[{text:'alpha',label:'a'},{text:'ALPHA',label:'a'},{text:'bravo',label:'b'},{text:'charlie',label:'b'}]});
 const summary=await call(e,`/api/datasets/${d.id}/profile`,{});assert.equal(summary.duplicate_count,1);assert.equal(summary.fingerprint.length,64);
 const exp=await call(e,'/api/experiments',{name:'baseline',dataset_id:d.id});
 const run=await call(e,`/api/experiments/${exp.id}/runs`,{seed:42,accuracy:.92,precision:.9,recall:.92,history:[],weights:{}});
 await rejection(e,'/api/models',{name:'unsafe',experiment_run_id:run.id,stage:'production'},400);
 const model=await call(e,'/api/models',{name:'Release candidate',experiment_run_id:run.id,stage:'candidate'});
 await rejection(e,`/api/models/${model.id}/promote`,{stage:'production',reason:'Skip testing'},409);
 const staging=await call(e,`/api/models/${model.id}/promote`,{stage:'staging',reason:'Holdout verified'});assert.equal(staging.stage,'staging');
 const prod=await call(e,`/api/models/${model.id}/promote`,{stage:'production',reason:'Governance review passed'});assert.equal(prod.stage,'production');
 const ledger=await call(e,'/api/promotions');assert.equal(ledger.items.length,2);
 }finally{e.stop()}
});
