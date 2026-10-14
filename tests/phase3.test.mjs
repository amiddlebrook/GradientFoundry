import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const app=require('./.compiled/index.js');
const advanced=require('./.compiled/advanced.js');
function env(){const sql=new DatabaseSync(':memory:');for(const f of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('migrations/'+f,'utf8'));return {sql,DB:{prepare(q){let args=[];return {bind(...v){args=v;return this},async all(){return {results:sql.prepare(q).all(...args)}},async first(){return sql.prepare(q).get(...args)??null},async run(){const x=sql.prepare(q).run(...args);return {meta:{changes:x.changes}}}}}},AI:{async run(){return {response:'Fixture response'}}},stop(){sql.close()}}}
async function call(e,path,data,method){const req=new Request('http://localhost:8787'+path,{method:method||(data===undefined?'GET':'POST'),headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const res=await app.api(req,e,new URL(req.url));if(!res.ok)throw new Error(`${path} ${res.status} ${await res.text()}`);return res.json()}
async function rejected(e,path,data,status){const req=new Request('http://localhost:8787'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});await assert.rejects(()=>app.api(req,e,new URL(req.url)),ex=>ex.status===status)}
test('grouped seed-controlled holdout is reproducible and records leakage warnings',async()=>{const e=env();try{
const records=[{text:'  ReFuNd  please  ',label:'refund'},{text:'refund please',label:'refund'},{text:'refund please',label:'billing'},{text:'billing invoice',label:'billing'},{text:'invoice copy',label:'billing'},{text:'payment receipt',label:'billing'},{text:'money back',label:'refund'},{text:'return item',label:'refund'}];
const pure=advanced.auditHoldout(records,.25,11),again=advanced.auditHoldout([...records].reverse(),.25,11);assert.equal(pure.overlap_count,0);assert.equal(pure.duplicate_count,2);assert.equal(pure.train_count,again.train_count);assert.equal(pure.test_count,again.test_count);assert.ok(pure.warnings.some(x=>x.includes('Conflicting labels')));
const d=await call(e,'/api/datasets',{name:'Leaky input',records});const audit=await call(e,`/api/datasets/${d.id}/holdout`,{seed:11,test_fraction:.25});assert.equal(audit.train_count+audit.test_count,records.length);
const saved=await call(e,'/api/holdout-audits');assert.equal(saved.items.length,1);assert.equal(saved.items[0].dataset,d.name??'Leaky input');
await rejected(e,`/api/datasets/${d.id}/holdout`,{seed:42,test_fraction:.9},400);
}finally{e.stop()}});
