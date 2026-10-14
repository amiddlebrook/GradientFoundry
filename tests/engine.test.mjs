import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const moduleUnderTest=require(resolve('tests/.compiled/index.js'));
test('GradientFoundry: reject single-class datasets',()=>{
 assert.throws(()=>moduleUnderTest.validateRecords([{text:'a',label:'x'},{text:'b',label:'x'},{text:'c',label:'x'},{text:'d',label:'x'}]));
 const rows=moduleUnderTest.validateRecords([{text:'a',label:'x'},{text:'b',label:'x'},{text:'c',label:'y'},{text:'d',label:'y'}]);
 assert.equal(rows.length,4);
});
