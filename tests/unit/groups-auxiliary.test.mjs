import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadFactory,testContext,toPlain} from '../helpers/load-factory.mjs';

const core=loadFactory('src/reveal/core.js','createRevealCore')();
function base(){
  const ctx=testContext(),bytes=fs.readFileSync('tests/fixtures/images/static.png');
  let doc=core.newDocument(ctx,'Sheet');
  doc=core.appendAsset(doc,{id:'image_1',mime:'image/png',width:120,height:80,byteLength:bytes.length,dataBase64:bytes.toString('base64')},ctx,'Page 1');
  return {doc,ctx,pageId:doc.pages[0].id};
}
function add(doc,ctx,pageId,rect){return core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId,rect},ctx).document;}

test('T06 F1 counts grouped answers separately from auxiliary covers',()=>{
  assert.equal(typeof core.counts,'function','counts must exist');
  const {ctx,pageId,...rest}=base();let doc=rest.doc;
  for(const x of [.05,.25,.45,.65,.8])doc=add(doc,ctx,pageId,{x,y:.2,w:.12,h:.2});
  const firstTwo=doc.questions.slice(0,2).map(q=>q.id);
  doc=core.applyCommand(doc,{type:'GROUP_QUESTIONS',questionIds:firstTwo},ctx).document;
  doc=core.applyCommand(doc,{type:'CONVERT_MASK_KIND',maskId:doc.masks[4].id,kind:'auxiliary'},ctx).document;
  assert.deepEqual(toPlain(core.counts(doc)),{pages:1,masks:5,questions:3,auxiliary:1});
  const grouped=doc.questions.find(q=>q.maskIds.length===2);assert.ok(grouped);
  assert.equal(doc.masks.filter(m=>m.questionId===grouped.id).length,2);
});

test('T06 grouping preserves prompt/answer text in problem order and ungroup copies it',()=>{
  const {doc:initial,ctx,pageId}=base();let doc=initial;
  doc=add(doc,ctx,pageId,{x:.1,y:.1,w:.15,h:.2});doc=add(doc,ctx,pageId,{x:.4,y:.1,w:.15,h:.2});
  doc={...doc,questions:doc.questions.map((q,i)=>({...q,prompt:i?'Name B':'Name A',answer:'Same answer'}))};
  const ids=doc.questions.map(q=>q.id);
  const grouped=core.applyCommand(doc,{type:'GROUP_QUESTIONS',questionIds:[ids[1],ids[0]]},ctx).document;
  assert.equal(grouped.questions.length,1);
  assert.equal(grouped.questions[0].id,ids[0]);
  assert.equal(grouped.questions[0].prompt,'Name A\nName B');
  assert.equal(grouped.questions[0].answer,'Same answer');
  const split=core.applyCommand(grouped,{type:'UNGROUP_QUESTION',questionId:ids[0]},ctx).document;
  assert.equal(split.questions.length,2);
  assert.equal(split.questions[0].prompt,'Name A\nName B');assert.equal(split.questions[1].prompt,'Name A\nName B');
  assert.equal(split.questions[0].answer,'Same answer');assert.equal(split.questions[1].answer,'Same answer');
});

test('T06 grouping over the text limit rejects atomically',()=>{
  const {doc:initial,ctx,pageId}=base();let doc=initial;
  doc=add(doc,ctx,pageId,{x:.1,y:.1,w:.15,h:.2});doc=add(doc,ctx,pageId,{x:.4,y:.1,w:.15,h:.2});
  doc={...doc,questions:doc.questions.map((q,i)=>({...q,prompt:i?'b':'a'.repeat(2000)}))};
  const before=JSON.stringify(doc);
  assert.throws(()=>core.applyCommand(doc,{type:'GROUP_QUESTIONS',questionIds:doc.questions.map(q=>q.id)},ctx),{code:'LIMIT_EXCEEDED'});
  assert.equal(JSON.stringify(doc),before);
});

test('T06 auxiliary covers stay closed and do not enter the free-study denominator',()=>{
  const {doc:initial,ctx,pageId}=base();let doc=initial;
  doc=add(doc,ctx,pageId,{x:.1,y:.1,w:.2,h:.2});doc=add(doc,ctx,pageId,{x:.4,y:.1,w:.2,h:.2});
  const auxId=doc.masks[1].id;
  doc=core.applyCommand(doc,{type:'CONVERT_MASK_KIND',maskId:auxId,kind:'auxiliary'},ctx).document;
  let session=core.startSession(doc,{mode:'free'},ctx);
  assert.deepEqual(toPlain(core.summaryFree(session)),{total:1,confirmed:0});
  session=core.revealPageFree(doc,session,pageId);
  const visible=core.visibilityFor(doc,session);
  assert.equal(visible.get(doc.masks.find(m=>m.id===auxId).id),true);
  assert.equal(visible.get(doc.masks.find(m=>m.kind==='answer').id),false);
});

test('T06 overlap warnings identify different problems but not members of one group',()=>{
  const {doc:initial,ctx,pageId}=base();let doc=initial;
  doc=add(doc,ctx,pageId,{x:.1,y:.1,w:.4,h:.4});doc=add(doc,ctx,pageId,{x:.3,y:.3,w:.4,h:.4});
  assert.equal(core.overlapWarnings(doc,pageId).length,1);
  doc=core.applyCommand(doc,{type:'GROUP_QUESTIONS',questionIds:doc.questions.map(q=>q.id)},ctx).document;
  assert.equal(core.overlapWarnings(doc,pageId).length,0);
});

test('T06 grouping rejects questions from different pages',()=>{
  const {doc:initial,ctx,pageId}=base();let doc=add(initial,ctx,pageId,{x:.1,y:.1,w:.2,h:.2});
  const bytes=fs.readFileSync('tests/fixtures/images/static.png');
  doc=core.appendAsset(doc,{id:'image_2',mime:'image/png',width:120,height:80,byteLength:bytes.length,dataBase64:bytes.toString('base64')},ctx,'Page 2');
  doc=add(doc,ctx,doc.pages[1].id,{x:.1,y:.1,w:.2,h:.2});
  assert.throws(()=>core.applyCommand(doc,{type:'GROUP_QUESTIONS',questionIds:doc.questions.map(q=>q.id)},ctx),{code:'INVALID_SHEET'});
});

test('T06 grouped and auxiliary covers round-trip through editable JSON',async()=>{
  const createProjectIO=loadFactory('src/reveal/project-io.js','createProjectIO');
  const {doc:initial,ctx,pageId}=base();let doc=initial;
  doc=add(doc,ctx,pageId,{x:.1,y:.1,w:.15,h:.2});doc=add(doc,ctx,pageId,{x:.4,y:.1,w:.15,h:.2});doc=add(doc,ctx,pageId,{x:.7,y:.1,w:.15,h:.2});
  doc=core.applyCommand(doc,{type:'GROUP_QUESTIONS',questionIds:doc.questions.slice(0,2).map(q=>q.id)},ctx).document;
  doc=core.applyCommand(doc,{type:'CONVERT_MASK_KIND',maskId:doc.masks[2].id,kind:'auxiliary'},ctx).document;
  let verified=0;const io=createProjectIO({core,imageIO:{verifyStoredAsset:async()=>{verified++;}},env:{Blob,TextDecoder,TextEncoder}});
  const text=io.serialize(doc,'editable','0.3.0');
  const loaded=await io.readJson(new Blob([text],{type:'application/json'}));
  assert.equal(verified,1);
  assert.deepEqual(toPlain(core.counts(loaded.document)),{pages:1,masks:3,questions:1,auxiliary:1});
  assert.equal(loaded.document.questions[0].maskIds.length,2);
});
test('T06 duplicate selection preserves grouped questions and auxiliary kind',()=>{
  const {doc:initial,ctx,pageId}=base();let doc=initial;
  doc=add(doc,ctx,pageId,{x:.05,y:.55,w:.12,h:.2});doc=add(doc,ctx,pageId,{x:.25,y:.55,w:.12,h:.2});doc=add(doc,ctx,pageId,{x:.55,y:.55,w:.12,h:.2});
  doc=core.applyCommand(doc,{type:'GROUP_QUESTIONS',questionIds:doc.questions.slice(0,2).map(q=>q.id)},ctx).document;
  doc=core.applyCommand(doc,{type:'CONVERT_MASK_KIND',maskId:doc.masks[2].id,kind:'auxiliary'},ctx).document;
  const grouped=doc.questions[0],aux=doc.masks.find(mask=>mask.kind==='auxiliary');
  const duplicated=core.applyCommand(doc,{type:'DUPLICATE_SELECTION',maskIds:[grouped.maskIds[0],aux.id]},ctx).document;
  assert.deepEqual(toPlain(core.counts(duplicated)),{pages:1,masks:6,questions:2,auxiliary:2});
  assert.equal(duplicated.questions.filter(question=>question.maskIds.length===2).length,2);
});
