import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadFactory,testContext,toPlain} from '../helpers/load-factory.mjs';

const core=loadFactory('src/reveal/core.js','createRevealCore')();

function pageAsset(id){
  const bytes=fs.readFileSync('tests/fixtures/images/static.png');
  return {id,mime:'image/png',width:120,height:80,byteLength:bytes.length,dataBase64:bytes.toString('base64')};
}
function makePages(count=3){
  const ctx=testContext();let doc=core.newDocument(ctx,'Sheet');
  for(let i=0;i<count;i++)doc=core.appendAsset(doc,pageAsset('asset_'+i),ctx,'Same name');
  return {doc,ctx};
}

test('T05 deletes a page with its questions/masks and unreferenced image, then Undo restores it',()=>{
  assert.equal(typeof core.createHistory,'function','createHistory must exist');
  assert.equal(typeof core.execute,'function','execute must exist');
  assert.equal(typeof core.undo,'function','undo must exist');
  const {doc:base,ctx}=makePages(1);
  const withMask=core.applyCommand(base,{type:'ADD_ANSWER_MASK',pageId:base.pages[0].id,rect:{x:.1,y:.1,w:.2,h:.2}},ctx).document;
  const history=core.createHistory(100);
  const deleted=core.execute(history,withMask,{type:'DELETE_PAGE',pageId:withMask.pages[0].id},ctx);
  assert.equal(deleted.mutation.document.pages.length,0);
  assert.equal(deleted.mutation.document.assets.length,0);
  assert.equal(deleted.mutation.document.questions.length,0);
  assert.equal(deleted.mutation.document.masks.length,0);
  const restored=core.undo(deleted.history,deleted.mutation.document,ctx);
  assert.equal(restored.mutation.document.pages.length,1);
  assert.equal(restored.mutation.document.assets.length,1);
  assert.equal(restored.mutation.document.questions.length,1);
  assert.equal(restored.mutation.document.masks.length,1);
  assert.ok(restored.mutation.document.revision>deleted.mutation.document.revision);
});

test('T05 page order is ID-based, permits duplicate names, and moves without changing IDs',()=>{
  const {doc,ctx}=makePages(3);
  const ids=doc.pages.map(p=>p.id);
  const renamed=core.applyCommand(doc,{type:'RENAME_PAGE',pageId:ids[1],title:'Same name'},ctx).document;
  assert.equal(renamed.pages[1].title,'Same name');
  const moved=core.applyCommand(renamed,{type:'MOVE_PAGE',pageId:ids[2],delta:-1},ctx).document;
  assert.deepEqual(toPlain(moved.pages.map(p=>p.id)),[ids[0],ids[2],ids[1]]);
});

test('T05 history keeps 100 operations and a new edit after Undo drops Redo',()=>{
  const {doc:base,ctx}=makePages(1);let doc=base,history=core.createHistory(100);
  for(let i=0;i<101;i++){const result=core.execute(history,doc,{type:'RENAME_PAGE',pageId:doc.pages[0].id,title:'Page '+i},ctx);history=result.history;doc=result.mutation.document;}
  assert.equal(history.undo.length,100);
  const undone=core.undo(history,doc,ctx);assert.equal(undone.history.redo.length,1);
  const edited=core.execute(undone.history,undone.mutation.document,{type:'RENAME_PAGE',pageId:doc.pages[0].id,title:'New branch'},ctx);
  assert.equal(edited.history.redo.length,0);
});

test('T05 Undo never rolls back document or surviving question revisions',()=>{
  const {doc:base,ctx}=makePages(1);
  const added=core.applyCommand(base,{type:'ADD_ANSWER_MASK',pageId:base.pages[0].id,rect:{x:.1,y:.1,w:.2,h:.2}},ctx).document;
  const history=core.createHistory();
  const moved=core.execute(history,added,{type:'SET_MASK_RECT',maskId:added.masks[0].id,rect:{x:.2,y:.1,w:.2,h:.2}},ctx);
  const afterRevision=moved.mutation.document.questions[0].revision;
  const undone=core.undo(moved.history,moved.mutation.document,ctx);
  assert.ok(undone.mutation.document.revision>moved.mutation.document.revision);
  assert.ok(undone.mutation.document.questions[0].revision>=afterRevision);
});

test('T05 duplicate cover creates independent mask and question IDs',()=>{
  const {doc:base,ctx}=makePages(1);
  const added=core.applyCommand(base,{type:'ADD_ANSWER_MASK',pageId:base.pages[0].id,rect:{x:.1,y:.1,w:.2,h:.2}},ctx).document;
  const dup=core.applyCommand(added,{type:'DUPLICATE_MASK',maskId:added.masks[0].id},ctx).document;
  assert.equal(dup.masks.length,2);assert.equal(dup.questions.length,2);
  assert.notEqual(dup.masks[0].id,dup.masks[1].id);assert.notEqual(dup.questions[0].id,dup.questions[1].id);
});
