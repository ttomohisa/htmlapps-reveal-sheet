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

test('T13 opens every format-1 milestone fixture without dropping document data',async()=>{
  const io=project();
  for(const version of ['0.2.0','0.3.0','0.4.0','0.5.0','0.6.0']){
    const value=JSON.parse(fs.readFileSync('tests/fixtures/sheets/v'+version+'.reveal.json','utf8'));
    assert.equal(core.validateEnvelope(value).ok,true,version);
    const loaded=await io.readJson(asFile(value,'v'+version+'.reveal.json'));
    assert.equal(loaded.appVersion,version);
    assert.deepEqual(toPlain(loaded.document),toPlain(value.document));
  }
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


function manyPages(count){
  const value=clone(fixture),asset=value.document.assets[0],page=value.document.pages[0];
  value.document.assets=Array.from({length:count},(_,i)=>({...clone(asset),id:'image_'+i}));
  value.document.pages=Array.from({length:count},(_,i)=>({...clone(page),id:'page_'+i,imageId:'image_'+i,questionOrder:[]}));
  value.document.questions=[];value.document.masks=[];
  return value;
}
function manyQuestions(count){
  const value=clone(fixture),asset=clone(value.document.assets[0]);
  const pages=Math.ceil(count/core.limits.maxMasksPerPage);
  value.document.assets=Array.from({length:pages},(_,i)=>({...clone(asset),id:'image_'+i}));
  value.document.pages=Array.from({length:pages},(_,i)=>({id:'page_'+i,title:'Page '+(i+1),description:'',imageId:'image_'+i,questionOrder:[]}));
  value.document.questions=[];value.document.masks=[];
  for(let i=0;i<count;i++){
    const pageIndex=Math.floor(i/core.limits.maxMasksPerPage),qid='question_'+i,mid='mask_'+i;
    value.document.pages[pageIndex].questionOrder.push(qid);
    value.document.questions.push({id:qid,pageId:'page_'+pageIndex,revision:1,maskIds:[mid],prompt:'',answer:''});
    value.document.masks.push({id:mid,pageId:'page_'+pageIndex,kind:'answer',questionId:qid,rect:{x:0,y:0,w:1,h:1}});
  }
  return value;
}

test('T13 structural limits accept the exact boundary and reject the next item',()=>{
  const pagesAt=manyPages(core.limits.maxPages);
  assert.equal(core.validateEnvelope(pagesAt).ok,true);
  assert.equal(core.validateEnvelope(manyPages(core.limits.maxPages+1)).ok,false);

  const questionsAt=manyQuestions(core.limits.maxQuestions);
  assert.equal(core.validateEnvelope(questionsAt).ok,true);
  const questionsOver=manyQuestions(core.limits.maxQuestions+1);
  const over=core.validateEnvelope(questionsOver);
  assert.equal(over.ok,false);
  assert.equal(over.errors[0].code,'INVALID_SHEET');

  const perPage=clone(fixture),asset=perPage.document.assets[0];
  perPage.document.pages[0].questionOrder=[];perPage.document.questions=[];perPage.document.masks=[];
  for(let i=0;i<core.limits.maxMasksPerPage;i++){
    const q='q_'+i,m='m_'+i;perPage.document.pages[0].questionOrder.push(q);
    perPage.document.questions.push({id:q,pageId:perPage.document.pages[0].id,revision:1,maskIds:[m],prompt:'',answer:''});
    perPage.document.masks.push({id:m,pageId:perPage.document.pages[0].id,kind:'answer',questionId:q,rect:{x:0,y:0,w:1,h:1}});
  }
  assert.equal(core.validateEnvelope(perPage).ok,true);
  const overPage=clone(perPage),i=core.limits.maxMasksPerPage,q='q_'+i,m='m_'+i;
  overPage.document.pages[0].questionOrder.push(q);
  overPage.document.questions.push({id:q,pageId:overPage.document.pages[0].id,revision:1,maskIds:[m],prompt:'',answer:''});
  overPage.document.masks.push({id:m,pageId:overPage.document.pages[0].id,kind:'answer',questionId:q,rect:{x:0,y:0,w:1,h:1}});
  const pageCheck=core.validateEnvelope(overPage);
  assert.equal(pageCheck.ok,false);
  assert.equal(pageCheck.errors[0].code,'LIMIT_EXCEEDED');

  // Claimed dimensions are structurally checked here; PNG header equality is
  // independently enforced by imageIO.verifyStoredAsset during file import.
  const sideAt=clone(fixture);sideAt.document.assets[0].width=core.limits.maxSide;sideAt.document.assets[0].height=1;
  assert.equal(core.validateEnvelope(sideAt).ok,true);
  const sideOver=clone(sideAt);sideOver.document.assets[0].width=core.limits.maxSide+1;
  assert.equal(core.validateEnvelope(sideOver).ok,false);
});

test('T13 readJson rejects an over-limit file before reading bytes and rejects non-finite numeric JSON',async()=>{
  const io=project();let reads=0;
  const huge={name:'huge.reveal.json',size:core.limits.maxJsonBytes+1,arrayBuffer:async()=>{reads++;return new ArrayBuffer(0);}};
  await assert.rejects(io.readJson(huge),{code:'LIMIT_EXCEEDED'});
  assert.equal(reads,0);

  const raw=JSON.stringify(fixture).replace('"width":1','"width":1e9999');
  const file=new Blob([raw],{type:'application/json'});Object.defineProperty(file,'name',{value:'non-finite.reveal.json'});
  await assert.rejects(io.readJson(file),{code:'INVALID_SHEET'});
});

test('T13 object-for-array and oversized stored dimensions are rejected',()=>{
  const wrongArray=clone(fixture);wrongArray.document.pages={0:wrongArray.document.pages[0]};
  assert.equal(core.validateEnvelope(wrongArray).ok,false);
  const huge=clone(fixture);huge.document.assets[0].width=core.limits.maxSide+1;
  assert.equal(core.validateEnvelope(huge).ok,false);
});
