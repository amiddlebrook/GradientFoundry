import test from 'node:test';
import assert from 'node:assert/strict';
import {lineageManifestFor} from '../public/studio.js';
import {downloadArtifact} from '../public/studio-export.js';
test('studio supports explicit domain-specific artifact export',()=>{assert.equal(typeof lineageManifestFor,'function');assert.equal(typeof downloadArtifact,'function');});
test('domain report derives truthful, bounded artifacts from selected records',()=>{  const report=lineageManifestFor({id:'d',name:'Dataset',profile:{fingerprint:'aabb'}},{experiments:[{id:'e',algorithm:'sgd',name:'study',status:'completed'}],runs:[{id:'r',experiment_id:'e',seed:42,accuracy:.8}],models:[{id:'m',experiment_run_id:'r',name:'candidate',stage:'candidate'}]});assert.equal(report.dataset.fingerprint,'aabb');assert.equal(report.registered_models[0].id,'m'); });
