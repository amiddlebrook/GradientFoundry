import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {studioApi}=require('./.compiled/studio.js');
import {renderStudio} from '../public/studio.js';
function environment(){const db=new DatabaseSync(':memory:');for(const name of readdirSync('migrations').filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync('migrations/'+name,'utf8'));return {db,env:{DB:{prepare(q){let args=[];return {bind(...a){args=a;return this},async all(){return {results:db.prepare(q).all(...args)}},async first(){return db.prepare(q).get(...args)||null},async run(){const x=db.prepare(q).run(...args);return {meta:{changes:x.changes}}}}}}}}}
async function call(env,route,method='GET'){const req=new Request('http://localhost:8787'+route,{method});return studioApi(req,env,new URL(req.url))}

test('specialized GradientFoundry studio reads actual SQLite state',async()=>{
 const {db,env}=environment();try{db.exec(`INSERT INTO datasets VALUES('d','Dataset','desc','[]','2026-01-01'); INSERT INTO experiments VALUES('e','d','Experiment','hashed_softmax_sgd','{}','completed','2026-01-01','2026-01-01'); INSERT INTO experiment_runs VALUES('r','e',42,.84,.80,.85,'[]','{}','reviewed','2026-01-01'); INSERT INTO models VALUES('m','r','candidate','candidate','2026-01-01');`);
 const response=await call(env,'/api/studio/lineage');assert.equal(response.status,200);const body=await response.json();assert.equal(body.datasets.length,1);assert.equal(body.experiments[0].dataset_id,'d');assert.equal(body.runs[0].accuracy,.84);assert.equal(body.models[0].experiment_run_id,'r');
 const denied=await call(env,'/api/studio/lineage','POST');assert.equal(denied.status,405);
 }finally{db.close()}
});
test('studio endpoints require a dedicated protected route and a working JS module',async()=>{const {db,env}=environment();try{assert.equal(await call(env,'/api/studio/missing'),null);assert.equal(typeof renderStudio,'function');}finally{db.close()}});
import {lineageFor} from '../public/studio.js';
test('lineage selection excludes unrelated model records',()=>{const m=lineageFor('d',{experiments:[{id:'e',dataset_id:'d'},{id:'x',dataset_id:'z'}],runs:[{id:'r',experiment_id:'e'},{id:'y',experiment_id:'x'}],models:[{id:'m',experiment_run_id:'r'},{id:'n',experiment_run_id:'y'}]});assert.equal(m.models.length,1)});
