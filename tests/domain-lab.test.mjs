import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const worker=require('./.compiled/index.js').default;
const domain=require('./.compiled/domain-lab.js');
const rootToken='phase22-test-root-secret';
function fixture(){
 const db=new DatabaseSync(':memory:');
 for(const file of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+file,'utf8'));
 const env={ADMIN_TOKEN:rootToken,DB:{prepare(sql){let x=[];return{bind(...args){x=args;return this},async first(){return db.prepare(sql).get(...x)??null},async all(){return{results:db.prepare(sql).all(...x)}},async run(){const result=db.prepare(sql).run(...x);return{meta:{changes:result.changes}}}}}}};
 return{db,env};
}
async function call(env,path,method='GET',data,token=rootToken){
 const req=new Request('https://tests.workers.dev'+path,{method,headers:{Authorization:'Bearer '+token,...(data===undefined?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:JSON.stringify(data)});
 const result=await worker.fetch(req,env);
 return{status:result.status,body:await result.json()};
}

test('dataset quality detects normalized duplicates, label conflicts and skew',()=>{
 const rows=[{text:' Hello  WORLD ',label:'yes'},{text:'hello world',label:'no'},{text:'other',label:'yes'},{text:'third',label:'yes'}];
 const r=domain.datasetQuality(rows);assert.equal(r.records,4);assert.equal(r.unique_texts,3);assert.equal(r.duplicates.length,1);assert.equal(r.conflicts.length,1);assert.equal(r.majority_label_share,.75);
 assert.ok(r.warnings.some(x=>x.includes('Conflicting labels')));
 const clean=domain.datasetQuality([{text:'a',label:'A'},{text:'b',label:'B'}]);assert.equal(clean.conflicts.length,0);
});
test('quality endpoint returns stable digest without mutating experiment data',async()=>{
 const{db,env}=fixture();try{
 const recs=[{text:'refund',label:'yes'},{text:'refund',label:'no'},{text:'invoice',label:'no'},{text:'details',label:'yes'}];
 db.prepare('INSERT INTO datasets VALUES(?,?,?,?,?)').run('d1','Inbox', '',JSON.stringify(recs),'2026');
 const r=await call(env,'/api/lab/dataset-quality?dataset_id=d1');assert.equal(r.status,200);assert.equal(r.body.sha256.length,64);assert.equal(r.body.conflicts.length,1);
 const again=await call(env,'/api/lab/dataset-quality?dataset_id=d1');assert.equal(again.body.sha256,r.body.sha256);
 assert.equal(db.prepare('SELECT count(*) n FROM experiments').get().n,0);
 assert.equal((await call(env,'/api/lab/dataset-quality?dataset_id=unknown')).status,404);
 }finally{db.close()}
});
