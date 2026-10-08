import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {loadFactory,toPlain} from '../helpers/load-factory.mjs';

const core=loadFactory('src/reveal/core.js','createRevealCore')();
const createProjectIO=loadFactory('src/reveal/project-io.js','createProjectIO');
const io=createProjectIO({core,imageIO:{verifyStoredAsset:async()=>{}},env:{Blob,TextDecoder,TextEncoder}});
const versions=['0.2.0','0.3.0','0.4.0','0.5.0','0.6.0','0.7.0','0.8.0','0.9.0'];
function asFile(value,name){const file=new Blob([JSON.stringify(value)],{type:'application/json'});Object.defineProperty(file,'name',{value:name});return file;}

test('T19: every schema-version-1 milestone fixture opens in v1.0.0 without dropping document data',async()=>{
 const config=JSON.parse(fs.readFileSync('app.config.json','utf8'));
 const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
 const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
 assert.equal(config.version,'1.0.0');assert.equal(pkg.version,'1.0.0');assert.equal(lock.version,'1.0.0');assert.equal(lock.packages[''].version,'1.0.0');
 for(const version of versions){
  const path='tests/fixtures/sheets/v'+version+'.reveal.json';
  assert.equal(fs.existsSync(path),true,version);
  const value=JSON.parse(fs.readFileSync(path,'utf8'));
  assert.equal(value.schemaVersion,1,version);assert.equal(value.appVersion,version);
  assert.equal(core.validateEnvelope(value).ok,true,version);
  const loaded=await io.readJson(asFile(value,'v'+version+'.reveal.json'));
  assert.deepEqual(toPlain(loaded.document),toPlain(value.document),version);
 }
});

test('T19: canonical readable, root copy and restored self-extract bytes are identical',()=>{
 const readable=fs.readFileSync('dist/index.html'),root=fs.readFileSync('reveal-sheet.html');
 assert.deepEqual(root,readable);
 const wrapper=fs.readFileSync('dist/index.self-extract.html','utf8');
 const match=wrapper.match(/<script id="self-extract-payload" type="application\/octet-stream">([A-Za-z0-9+/=\r\n]+)<\/script>/);
 assert.ok(match,'self-extract payload missing');
 const restored=gunzipSync(Buffer.from(match[1].replace(/\s+/g,''),'base64'));
 assert.deepEqual(restored,readable);
});
