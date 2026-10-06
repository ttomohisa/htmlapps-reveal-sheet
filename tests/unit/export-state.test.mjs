import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadFactory,testContext} from '../helpers/load-factory.mjs';

const core=loadFactory('src/reveal/core.js','createRevealCore')();
const createProjectIO=loadFactory('src/reveal/project-io.js','createProjectIO');

function makeDoc(){
  const ctx=testContext(),bytes=fs.readFileSync('tests/fixtures/images/static.png');
  let doc=core.newDocument(ctx,'Export / lesson');
  doc=core.appendAsset(doc,{id:'image_1',mime:'image/png',width:120,height:80,byteLength:bytes.length,dataBase64:bytes.toString('base64')},ctx,'Page 1');
  doc=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId:doc.pages[0].id,rect:{x:.1,y:.2,w:.3,h:.25}},ctx).document;
  return doc;
}
function env(overrides={}){
  const clicks=[],revoked=[];
  const base={
    Blob,TextDecoder,TextEncoder,
    URL:{
      createObjectURL:()=> 'blob:export',
      revokeObjectURL:value=>revoked.push(value)
    },
    document:{
      body:{append:()=>{}},
      createElement:()=>({href:'',download:'',hidden:false,click(){clicks.push(this.download);},remove(){}})
    },
    setTimeout:fn=>{fn();return 1;}
  };
  return Object.assign(base,overrides,{__clicks:clicks,__revoked:revoked});
}
function project(runtime=env()){
  return {io:createProjectIO({core,imageIO:{verifyStoredAsset:async()=>{}},env:runtime}),runtime};
}
const playerTemplate='<!doctype html><script id="reveal-sheet-data" type="application/json">__REVEAL_LESSON_JSON__</script>';

test('T14 prepareExport freezes the output identity, measured size and sheet counts',async()=>{
  const {io}=project(),doc=makeDoc();
  assert.equal(typeof io.prepareExport,'function');
  const prepared=await io.prepareExport(doc,{kind:'json',filename:' a/b ',appVersion:'0.7.0',preview:true},4);
  assert.equal(prepared.kind,'json');
  assert.equal(prepared.generation,4);
  assert.equal(prepared.documentId,doc.id);
  assert.equal(prepared.documentRevision,doc.revision);
  assert.equal(prepared.filename,'a_b.reveal.json');
  assert.equal(prepared.size,prepared.blob.size);
  assert.deepEqual(prepared.counts,{pages:1,masks:1,questions:1,auxiliary:0});
  assert.equal(prepared.preview,true);
});

test('T14 invalidating a generation prevents stale prepared output from becoming downloadable',async()=>{
  const {io}=project(),doc=makeDoc();
  assert.equal(typeof io.invalidateExport,'function');
  const pending=io.prepareExport(doc,{kind:'html',filename:'lesson',playerTemplate,appVersion:'0.7.0'},7);
  io.invalidateExport(7);
  await assert.rejects(pending,{code:'EXPORT_FAILED'});
});

test('T14 requestDownload reports only that the browser save was started',async()=>{
  const {io,runtime}=project(),doc=makeDoc();
  assert.equal(typeof io.requestDownload,'function');
  const prepared=await io.prepareExport(doc,{kind:'json',filename:'lesson',appVersion:'0.7.0'},8);
  const receipt=io.requestDownload(prepared);
  assert.deepEqual(receipt,{started:true,filename:'lesson.reveal.json',size:prepared.size,kind:'json',generation:8});
  assert.deepEqual(runtime.__clicks,['lesson.reveal.json']);
  assert.deepEqual(runtime.__revoked,['blob:export']);
  assert.equal('completed' in receipt,false);
});

test('T14 download setup failure preserves the prepared export for retry and reports EXPORT_FAILED',async()=>{
  const runtime=env();
  runtime.URL.createObjectURL=()=>{throw new Error('blocked');};
  const {io}=project(runtime),doc=makeDoc();
  const prepared=await io.prepareExport(doc,{kind:'json',filename:'lesson',appVersion:'0.7.0'},9);
  await assert.rejects(async()=>io.requestDownload(prepared),{code:'EXPORT_FAILED'});
  assert.equal(prepared.filename,'lesson.reveal.json');
  assert.equal(prepared.blob.size>0,true);
});

test('T14 filename rules keep format suffixes distinct and protect reserved names',()=>{
  const {io}=project();
  assert.equal(io.sanitizeFilename(' a/b ','json'),'a_b.reveal.json');
  assert.equal(io.sanitizeFilename(' a/b ','html'),'a_b.reveal.html');
  assert.equal(io.sanitizeFilename('CON','html'),'_CON.reveal.html');
  assert.equal(io.sanitizeFilename('../lesson.reveal.json','html'),'.._lesson.reveal.html');
});
