import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadFactory,toPlain} from '../helpers/load-factory.mjs';

const core=loadFactory('src/reveal/core.js','createRevealCore')();
const createProjectIO=loadFactory('src/reveal/project-io.js','createProjectIO');
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/sheets/v0.2.0.reveal.json','utf8'));

function project(verifyStoredAsset=async()=>{}){
  return createProjectIO({
    core,
    imageIO:{verifyStoredAsset},
    env:{Blob,TextDecoder,TextEncoder}
  });
}
function clone(value){return structuredClone(value);}
function asFile(value,name='fixture.reveal.json'){
  const file=new Blob([JSON.stringify(value)],{type:'application/json'});
  Object.defineProperty(file,'name',{value:name});
  return file;
}

test('T13 keeps schema v1 editable files interoperable after guided-study defaults were introduced',async()=>{
  const io=project();
  const value=clone(fixture);
  value.appVersion='0.4.0';
  value.document.defaults={mode:'guided',otherAnswers:'visible'};
  assert.equal(core.validateEnvelope(value).ok,true);
  const loaded=await io.readJson(asFile(value));
  assert.deepEqual(toPlain(loaded.document.defaults),{mode:'guided',otherAnswers:'visible'});
  const roundTrip=JSON.parse(io.serialize(loaded.document,'editable','0.7.0'));
  assert.deepEqual(toPlain(roundTrip.document.defaults),{mode:'guided',otherAnswers:'visible'});
});

test('T13 accepts the v0.2.0 format-1 fixture and rejects future schema versions explicitly',async()=>{
  const io=project();
  assert.equal(core.validateEnvelope(fixture).ok,true);
  const loaded=await io.readJson(asFile(fixture));
  assert.equal(loaded.appVersion,'0.2.0');
  const future=clone(fixture);future.schemaVersion=2;
  const checked=core.validateEnvelope(future);
  assert.equal(checked.ok,false);
  assert.equal(checked.errors[0].code,'UNSUPPORTED_SCHEMA');
  await assert.rejects(io.readJson(asFile(future,'future.reveal.json')),{code:'UNSUPPORTED_SCHEMA'});
});

test('T13 rejects structural pollution keys but preserves the same text as ordinary values',async()=>{
  const io=project();
  const safe=clone(fixture);
  safe.document.title='__proto__ constructor prototype </script>';
  safe.document.pages[0].title='constructor';
  safe.document.pages[0].description='__proto__';
  assert.equal(core.validateEnvelope(safe).ok,true);
  const loaded=await io.readJson(asFile(safe));
  assert.equal(loaded.document.title,safe.document.title);

  const polluted=JSON.parse(JSON.stringify(fixture));
  polluted.document.pages[0].constructor={polluted:true};
  assert.equal(core.validateEnvelope(polluted).ok,false);

  const protoKey=JSON.parse(JSON.stringify(fixture));
  Object.defineProperty(protoKey.document.pages[0],'__proto__',{value:{polluted:true},enumerable:true});
  assert.equal(core.validateEnvelope(protoKey).ok,false);
});

test('T13 rejects duplicate ids, orphan assets, cross-page groups and invalid embedded-byte claims',()=>{
  const duplicate=clone(fixture);
  duplicate.document.pages.push({...clone(duplicate.document.pages[0])});
  assert.equal(core.validateEnvelope(duplicate).ok,false);

  const orphan=clone(fixture);
  orphan.document.assets.push({...clone(orphan.document.assets[0]),id:'image_orphan'});
  assert.equal(core.validateEnvelope(orphan).ok,false);

  const cross=clone(fixture);
  cross.document.assets.push({...clone(cross.document.assets[0]),id:'image_2'});
  cross.document.pages.push({id:'page_2',title:'Page 2',description:'',imageId:'image_2',questionOrder:[]});
  cross.document.questions.push({id:'question_1',pageId:'page_fixture',revision:1,maskIds:['mask_1'],prompt:'',answer:''});
  cross.document.pages[0].questionOrder=['question_1'];
  cross.document.masks.push({id:'mask_1',pageId:'page_2',kind:'answer',questionId:'question_1',rect:{x:0,y:0,w:1,h:1}});
  assert.equal(core.validateEnvelope(cross).ok,false);

  const bytes=clone(fixture);
  bytes.document.assets[0].byteLength+=1;
  assert.equal(core.validateEnvelope(bytes).ok,false);
});
