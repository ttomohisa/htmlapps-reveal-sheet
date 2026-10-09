import '../../scripts/prepare-test-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadFactory,testContext,toPlain} from '../helpers/load-factory.mjs';
const core=loadFactory('src/reveal/core.js','createRevealCore')();
function fixture(){
  const ctx=testContext(),bytes=fs.readFileSync('tests/fixtures/images/static.png');
  let doc=core.newDocument(ctx,'Question editing');
  doc=core.appendAsset(doc,{id:'image_1',mime:'image/png',width:120,height:80,byteLength:bytes.length,dataBase64:bytes.toString('base64')},ctx,'Page');
  const pageId=doc.pages[0].id;
  for(const x of [.05,.25,.45,.65])doc=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId,rect:{x,y:.2,w:.12,h:.2}},ctx).document;
  doc=core.applyCommand(doc,{type:'GROUP_QUESTIONS',questionIds:doc.questions.slice(0,2).map(q=>q.id)},ctx).document;
  doc=core.applyCommand(doc,{type:'SET_QUESTION_TEXT',questionId:doc.questions[0].id,prompt:'Name both parts',answer:'Alpha / ベータ'},ctx).document;
  doc=core.applyCommand(doc,{type:'CONVERT_MASK_KIND',maskId:doc.masks[3].id,kind:'auxiliary'},ctx).document;
  return {ctx,doc,pageId};
}
test('single cover duplication keeps the whole grouped question and its authored text',()=>{
  const {ctx,doc}=fixture(),source=doc.questions[0];
  const result=core.applyCommand(doc,{type:'DUPLICATE_MASK',maskId:source.maskIds[0]},ctx);
  const copy=result.document.questions.find(q=>!doc.questions.some(old=>old.id===q.id));
  assert.equal(copy.prompt,source.prompt);assert.equal(copy.answer,source.answer);
  assert.equal(copy.maskIds.length,2);assert.equal(copy.revision,1);
  assert.deepEqual(toPlain(result.document.pages[0].questionOrder),[source.id,copy.id,doc.questions[1].id]);
  assert.equal(result.document.masks.length,6);
  assert.deepEqual(toPlain(result.affectedQuestionIds),[copy.id]);
  assert.equal(core.validateEnvelope({format:'reveal-sheet',schemaVersion:1,appVersion:'1.0.1',kind:'editable',document:result.document}).ok,true);
});
test('single auxiliary duplication remains auxiliary and does not create a question',()=>{
  const {ctx,doc}=fixture(),source=doc.masks.find(m=>m.kind==='auxiliary');
  const result=core.applyCommand(doc,{type:'DUPLICATE_MASK',maskId:source.id},ctx);
  assert.equal(result.document.questions.length,doc.questions.length);
  const copy=result.document.masks.find(m=>!doc.masks.some(old=>old.id===m.id));
  assert.equal(copy.kind,'auxiliary');assert.equal(copy.questionId,null);
  assert.deepEqual(toPlain(result.affectedQuestionIds),toPlain(doc.questions.map(q=>q.id)));
});
test('question ordering moves one grouped question without changing its identity or current study',()=>{
  const {ctx,doc}=fixture(),[first,last]=doc.pages[0].questionOrder;
  let session=core.startSession(doc,{mode:'guided'});session=core.revealCurrent(session,session.epoch);session=core.rate(session,first,'recalled',session.epoch);
  const result=core.applyCommand(doc,{type:'MOVE_QUESTION',questionId:first,delta:1},ctx);
  assert.deepEqual(toPlain(result.document.pages[0].questionOrder),[last,first]);
  assert.equal(result.document.questions,doc.questions);assert.equal(result.document.masks,doc.masks);
  assert.deepEqual(toPlain(result.affectedQuestionIds),[]);
  const resumed=core.reconcileSession(session,doc,result);
  assert.deepEqual(toPlain(resumed.queue.map(item=>item.questionId)),[first,last]);assert.equal(resumed.ratings[first],'recalled');
  assert.deepEqual(toPlain(core.startSession(result.document,{mode:'guided'}).queue.map(item=>item.questionId)),[last,first]);
});
test('question order boundaries are no-ops and invalid requests reject atomically',()=>{
  const {ctx,doc}=fixture(),[first,last]=doc.pages[0].questionOrder;
  for(const [questionId,delta] of [[first,-1],[last,1]])assert.equal(core.applyCommand(doc,{type:'MOVE_QUESTION',questionId,delta},ctx).document,doc);
  for(const [questionId,delta] of [[first,0],[first,2],['missing',1]])assert.throws(()=>core.applyCommand(doc,{type:'MOVE_QUESTION',questionId,delta},ctx),{code:'INVALID_SHEET'});
});
test('question order supports Undo/Redo and editable JSON round trips',async()=>{
  const {ctx,doc}=fixture(),first=doc.pages[0].questionOrder[0];
  const changed=core.execute(core.createHistory(),doc,{type:'MOVE_QUESTION',questionId:first,delta:1},ctx);
  const undone=core.undo(changed.history,changed.mutation.document,ctx);
  assert.deepEqual(toPlain(undone.mutation.document.pages[0].questionOrder),toPlain(doc.pages[0].questionOrder));
  const redone=core.redo(undone.history,undone.mutation.document,ctx);
  assert.deepEqual(toPlain(redone.mutation.document.pages[0].questionOrder),toPlain(changed.mutation.document.pages[0].questionOrder));
  const io=loadFactory('src/reveal/project-io.js','createProjectIO')({core,imageIO:{verifyStoredAsset:async()=>{}},env:{Blob,TextDecoder,TextEncoder}});
  const imported=await io.readJson(io.prepareJson(redone.mutation.document,'1.0.1'));
  assert.deepEqual(toPlain(imported.document.pages[0].questionOrder),toPlain(redone.mutation.document.pages[0].questionOrder));
});

test('question order controls are present in the existing optional question panel',()=>{
 const template=fs.readFileSync('src/index.template.html','utf8');
 for(const id of ['questionOrderPosition','questionEarlierButton','questionLaterButton'])assert.match(template,new RegExp('id="'+id+'"'));
});
test('main and lesson language buttons expose a localized destination title',()=>{
 for(const [file,id] of [['src/index.template.html','languageButton'],['src/reveal/player.js','lessonLanguage']]){
  const source=fs.readFileSync(file,'utf8');
  assert.equal(source.includes("$('"+(id==='languageButton'?'#':'')+id+"').setAttribute('title'"),true,file);
 }
});


test('duplicate quota failures preserve the editor document, selection and history with a localized status',()=>{
 const {ctx,doc:initial,pageId}=fixture();let doc=initial;
 while(doc.masks.length<199)doc=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId,rect:{x:.1,y:.6,w:.1,h:.1}},ctx).document;
 const original=JSON.stringify(doc),source=fs.readFileSync('src/reveal/editor.js','utf8');
 for(const name of ['duplicateSelected','duplicateSelection']){
  const start=source.indexOf('  function '+name+'('),end=source.indexOf('\n  function ',start+1),events=[];
  const selected=new Set(doc.questions[0].maskIds),sandbox=vm.createContext({core,ctx,doc,busy:false,mode:'create',selectedMaskIds:selected,currentMask:()=>doc.masks[0],currentPage:()=>doc.pages[0],commit:()=>events.push('commit'),status:key=>events.push(key),refreshCopy:()=>{}});
  vm.runInContext(source.slice(start,end),sandbox);
  assert.doesNotThrow(()=>sandbox[name]());
  assert.deepEqual(events,['error_LIMIT_EXCEEDED']);assert.equal(JSON.stringify(sandbox.doc),original);assert.equal(sandbox.selectedMaskIds,selected);
 }
});

test('duplicating authored text over the sheet budget fails atomically',()=>{
 const {ctx,doc:initial,pageId}=fixture();let doc=initial;
 // 65 pairs of 2,000 four-byte characters fit; the next copy exceeds 1 MiB.
 while(doc.questions.length<65)doc=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId,rect:{x:.1,y:.6,w:.1,h:.1}},ctx).document;
 for(const question of doc.questions)doc=core.applyCommand(doc,{type:'SET_QUESTION_TEXT',questionId:question.id,prompt:'🟢'.repeat(2000),answer:'🟦'.repeat(2000)},ctx).document;
 const snapshot=JSON.stringify(doc);
 assert.throws(()=>core.applyCommand(doc,{type:'DUPLICATE_MASK',maskId:doc.questions.at(-1).maskIds[0]},ctx),{code:'LIMIT_EXCEEDED'});
 assert.equal(JSON.stringify(doc),snapshot);
});
