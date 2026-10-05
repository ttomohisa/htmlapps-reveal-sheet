import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadFactory,testContext,toPlain} from '../helpers/load-factory.mjs';

const core=loadFactory('src/reveal/core.js','createRevealCore')();
let createProjectIO=null;
try{createProjectIO=loadFactory('src/reveal/project-io.js','createProjectIO');}catch(error){if(error?.code!=='ENOENT')throw error;}

function makeDoc(title='Sheet'){
  const ctx=testContext();
  let doc=core.newDocument(ctx,title);
  const bytes=fs.readFileSync('tests/fixtures/images/static.png');
  doc=core.appendAsset(doc,{id:'image_1',mime:'image/png',width:120,height:80,byteLength:bytes.length,dataBase64:bytes.toString('base64')},ctx,'Page 1');
  doc=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId:doc.pages[0].id,rect:{x:.1,y:.2,w:.3,h:.25}},ctx).document;
  return doc;
}
function envelope(doc=makeDoc()){return {format:'reveal-sheet',schemaVersion:1,appVersion:'0.2.0',kind:'editable',document:doc};}
function project(fakeVerify=async()=>{}){
  assert.equal(typeof createProjectIO,'function','createProjectIO must exist');
  return createProjectIO({core,imageIO:{verifyStoredAsset:fakeVerify},env:{Blob,TextDecoder,TextEncoder}});
}

test('T04 validates format 1 references strictly while allowing hostile-looking plain text',()=>{
  assert.equal(typeof core.validateEnvelope,'function','validateEnvelope must exist');
  const valid=envelope(makeDoc('</script><img src=x onerror=alert(1)>'));
  assert.equal(core.validateEnvelope(valid).ok,true);

  const unknown={...valid,unexpected:true};
  assert.equal(core.validateEnvelope(unknown).ok,false);

  const orphan=structuredClone(valid);orphan.document.pages[0].imageId='missing';
  assert.equal(core.validateEnvelope(orphan).ok,false);

  const badRect=structuredClone(valid);badRect.document.masks[0].rect.w=0;
  assert.equal(core.validateEnvelope(badRect).ok,false);
});

test('T04 sanitizes editable filenames in the specified order',()=>{
  const io=project();
  assert.equal(io.sanitizeFilename('','json'),'reveal-sheet.reveal.json');
  assert.equal(io.sanitizeFilename(' a/b ','json'),'a_b.reveal.json');
  assert.equal(io.sanitizeFilename('CON','json'),'_CON.reveal.json');
  assert.equal(io.sanitizeFilename('con.notes','json'),'_con.notes.reveal.json');
  assert.equal(io.sanitizeFilename('lesson.reveal.json','json'),'lesson.reveal.json');
  assert.equal(io.sanitizeFilename('lesson.JSON','json'),'lesson.reveal.json');
});

test('T04 serialize uses a whitelist and does not export editor or study state',()=>{
  const io=project();
  const doc={...makeDoc(),ratings:{secret:'again'},inputFilename:'private.png'};
  const text=io.serialize(doc,'editable','0.2.0');
  const saved=JSON.parse(text);
  assert.equal(saved.format,'reveal-sheet');
  assert.equal(saved.schemaVersion,1);
  assert.equal(saved.kind,'editable');
  assert.equal(saved.document.id,doc.id);
  assert.equal('ratings' in saved.document,false);
  assert.equal('inputFilename' in saved.document,false);
  assert.deepEqual(toPlain(saved.document.masks[0].rect),{x:.1,y:.2,w:.3,h:.25});
});

test('T04 readJson verifies every embedded PNG before returning a new document',async()=>{
  let verified=0;const io=project(async()=>{verified++;});
  const value=envelope();
  const file=new Blob([JSON.stringify(value)],{type:'application/json'});
  const read=await io.readJson(file);
  assert.equal(read.document.id,value.document.id);
  assert.equal(verified,value.document.assets.length);
});

test('T04 rejects invalid, future, or currently unsupported editable data atomically',async()=>{
  const io=project();
  const future=envelope();future.schemaVersion=2;
  await assert.rejects(io.readJson(new Blob([JSON.stringify(future)])),{code:'UNSUPPORTED_SCHEMA'});

  const grouped=envelope();const original=grouped.document.masks[0];
  grouped.document.masks.push({...original,id:'mask_2'});
  grouped.document.questions[0].maskIds.push('mask_2');
  assert.equal(core.validateEnvelope(grouped).ok,true);
  await assert.rejects(io.readJson(new Blob([JSON.stringify(grouped)])),{code:'INVALID_SHEET'});

  await assert.rejects(io.readJson(new Blob(['{"format":'])),{code:'INVALID_SHEET'});
});
