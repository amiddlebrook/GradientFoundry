import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
function luminance(hex){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722}
function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
test('palette supplies distinct semantic hues and legible reading surfaces',()=>{
 const html=readFileSync('public/index.html','utf8');assert.match(html,/href="\/palette-balance\.css"/);
 const css=readFileSync('public/palette-balance.css','utf8');
 const tokens={};for(const [,key,value] of css.matchAll(/--(bg|surface|text|muted|accent|info|success|warning):(#(?:[0-9a-fA-F]{6}))/g))tokens[key]=value;
 for(const name of ['bg','surface','text','muted','accent','info','success','warning'])assert.ok(tokens[name],`Missing ${name} color token`);
 assert.ok(contrast(tokens.text,tokens.bg)>=7,'Primary text must pass AAA contrast on app background');
 assert.ok(contrast(tokens.text,tokens.surface)>=7,'Primary text must pass AAA contrast on cards');
 assert.ok(contrast(tokens.muted,tokens.surface)>=4.5,'Supporting text must pass AA contrast');
 assert.equal(new Set([tokens.accent,tokens.info,tokens.success,tokens.warning]).size,4,'Semantic colors must be distinct');
 assert.match(css,/:focus-visible/,'Visible keyboard focus required');
});
import {datasetGates} from '../public/domain-lab.js';
test('quality gates distinguish contradictory annotations from statistical cautions',()=>{
 const base={records:400,conflicts:[],duplicates:[],majority_label_share:.5};
 assert.equal(datasetGates(base).level,'no flagged issues');
 const warn=datasetGates({...base,records:10,majority_label_share:.82,duplicates:[{id:1}]});assert.equal(warn.level,'caution');assert.equal(warn.issues.length,3);
 const blocker=datasetGates({...base,conflicts:[{id:1}]});assert.equal(blocker.level,'blocker');assert.ok(blocker.issues[0].text.includes('contradictory'));
});
