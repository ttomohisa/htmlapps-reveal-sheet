import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadFactory,testContext,toPlain} from '../helpers/load-factory.mjs';

const core=loadFactory('src/reveal/core.js','createRevealCore')();
function fixture(){
  const ctx=testContext(),bytes=fs.readFileSync('tests/fixtures/images/static.png');
  let doc=core.newDocument(ctx,'Session edits');
  doc=core.appendAsset(doc,{id:'image_1',mime:'image/png',width:120,height:80,byteLength:bytes.length,dataBase64:bytes.toString('base64')},ctx,'Page 1');
  const page1=doc.pages[0].id;
  doc=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId:page1,rect:{x:.05,y:.1,w:.18,h:.2}},ctx).document;
  doc=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId:page1,rect:{x:.35,y:.1,w:.18,h:.2}},ctx).document;
  doc=core.appendAsset(doc,{id:'image_2',mime:'image/png',width:120,height:80,byteLength:bytes.length,dataBase64:bytes.toString('base64')},ctx,'Page 2');
  const page2=doc.pages[1].id;
  doc=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId:page2,rect:{x:.65,y:.55,w:.18,h:.2}},ctx).document;
  return {doc,ctx,page1,page2,qids:doc.pages.flatMap(page=>page.questionOrder)};
}
function assess(session,qid,rating){let next=core.goToQuestion(session,qid);next=core.revealCurrent(next,next.epoch);return core.rate(next,qid,rating,next.epoch);}

test('T08 geometry change invalidates only that question and Undo never revives the old rating',()=>{
  const {doc,ctx,qids}=fixture();let session=core.startSession(doc,{mode:'guided'},ctx);
  session=assess(session,qids[0],'recalled');session=assess(session,qids[1],'again');session=core.goToQuestion(session,qids[0]);
  const mask=doc.masks.find(item=>item.questionId===qids[0]);
  let history=core.createHistory();const executed=core.execute(history,doc,{type:'SET_MASK_RECT',maskId:mask.id,rect:{...mask.rect,x:mask.rect.x+1/120}},ctx);history=executed.history;
  let reconciled=core.reconcileSession(session,doc,executed.mutation);
  assert.equal(reconciled.ratings[qids[0]],'unanswered');assert.equal(reconciled.ratings[qids[1]],'again');
  assert.equal(reconciled.queue[reconciled.index].questionId,qids[0]);assert.equal(reconciled.stage,'hidden');
  assert.equal(reconciled.queue.find(item=>item.questionId===qids[0]).questionRevision,executed.mutation.document.questions.find(q=>q.id===qids[0]).revision);
  const undone=core.undo(history,executed.mutation.document);
  reconciled=core.reconcileSession(reconciled,executed.mutation.document,undone.mutation);
  assert.equal(reconciled.ratings[qids[0]],'unanswered');assert.equal(reconciled.ratings[qids[1]],'again');
});

test('T08 auxiliary edit invalidates same-page questions but page metadata edits preserve ratings',()=>{
  const {doc:base,ctx,page1,qids}=fixture();
  let withAux=core.applyCommand(base,{type:'ADD_ANSWER_MASK',pageId:page1,rect:{x:.7,y:.1,w:.15,h:.2}},ctx).document;
  const auxSource=withAux.masks.at(-1);withAux=core.applyCommand(withAux,{type:'CONVERT_MASK_KIND',maskId:auxSource.id,kind:'auxiliary'},ctx).document;
  let session=core.startSession(withAux,{mode:'guided'},ctx);session=assess(session,qids[0],'recalled');session=assess(session,qids[1],'again');session=assess(session,qids[2],'recalled');
  const aux=withAux.masks.find(mask=>mask.kind==='auxiliary');
  const moved=core.applyCommand(withAux,{type:'SET_MASK_RECT',maskId:aux.id,rect:{...aux.rect,y:aux.rect.y+1/80}},ctx);
  session=core.reconcileSession(session,withAux,moved);
  assert.equal(session.ratings[qids[0]],'unanswered');assert.equal(session.ratings[qids[1]],'unanswered');assert.equal(session.ratings[qids[2]],'recalled');
  const renamed=core.applyCommand(moved.document,{type:'RENAME_PAGE',pageId:page1,title:'Renamed'},ctx);
  const afterRename=core.reconcileSession(session,moved.document,renamed);
  assert.deepEqual(toPlain(afterRename.ratings),toPlain(session.ratings));
});

test('T08 deleting the current question selects the next survivor and normal sessions append new questions',()=>{
  const {doc,ctx,page1,qids}=fixture();let session=core.startSession(doc,{mode:'guided'},ctx);session=core.goToQuestion(session,qids[1]);
  const mask=doc.masks.find(item=>item.questionId===qids[1]),removed=core.applyCommand(doc,{type:'DELETE_MASK',maskId:mask.id},ctx);
  session=core.reconcileSession(session,doc,removed);
  assert.deepEqual(toPlain(session.queue.map(item=>item.questionId)),[qids[0],qids[2]]);assert.equal(session.queue[session.index].questionId,qids[2]);
  const added=core.applyCommand(removed.document,{type:'ADD_ANSWER_MASK',pageId:page1,rect:{x:.72,y:.25,w:.15,h:.2}},ctx);
  const addedId=added.addedQuestionIds[0];session=core.reconcileSession(session,removed.document,added);
  assert.deepEqual(toPlain(session.queue.map(item=>item.questionId)),[qids[0],qids[2],addedId]);assert.equal(session.ratings[addedId],'unanswered');
});

test('T08 review sessions keep their start target set when new questions are added',()=>{
  const {doc,ctx,page1,qids}=fixture();let original=core.startSession(doc,{mode:'guided'},ctx);original=assess(original,qids[0],'again');
  let review=core.makeReviewSession(doc,original,'again',ctx);assert.deepEqual(toPlain(review.queue.map(item=>item.questionId)),[qids[0]]);
  const added=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId:page1,rect:{x:.72,y:.25,w:.15,h:.2}},ctx);
  review=core.reconcileSession(review,doc,added);
  assert.deepEqual(toPlain(review.queue.map(item=>item.questionId)),[qids[0]]);assert.equal(review.ratings[added.addedQuestionIds[0]],undefined);
});

test('T08 grouping invalidates the survivor, removes deleted IDs, and moves a deleted current item to the old next item',()=>{
  const {doc,ctx,qids}=fixture();let session=core.startSession(doc,{mode:'guided'},ctx);session=assess(session,qids[0],'recalled');session=assess(session,qids[1],'again');session=core.goToQuestion(session,qids[1]);
  const grouped=core.applyCommand(doc,{type:'GROUP_QUESTIONS',questionIds:[qids[0],qids[1]]},ctx);session=core.reconcileSession(session,doc,grouped);
  assert.deepEqual(toPlain(session.queue.map(item=>item.questionId)),[qids[0],qids[2]]);assert.equal(session.ratings[qids[0]],'unanswered');assert.equal(session.ratings[qids[1]],undefined);assert.equal(session.queue[session.index].questionId,qids[2]);
});

test('T08 free session drops affected confirmation/open state but preserves unrelated confirmation',()=>{
  const {doc,ctx,qids}=fixture();let session=core.startSession(doc,{mode:'free'},ctx);session=core.toggleFree(session,qids[0]);session=core.toggleFree(session,qids[1]);
  const mask=doc.masks.find(item=>item.questionId===qids[0]),moved=core.applyCommand(doc,{type:'SET_MASK_RECT',maskId:mask.id,rect:{...mask.rect,x:mask.rect.x+1/120}},ctx);
  session=core.reconcileSession(session,doc,moved);
  assert.deepEqual(toPlain(session.confirmedQuestionIds),[qids[1]]);assert.deepEqual(toPlain(session.openQuestionIds),[qids[1]]);
});

test('T08 revealTarget leaves an already-visible target alone and recenters only on explicit request',()=>{
  const {doc,ctx,qids}=fixture();const far={zoom:4,centerX:.8,centerY:.8};
  const moved=core.revealTarget(doc,qids[0],far);assert.notDeepEqual(toPlain(moved),toPlain(far));assert.ok(moved.centerX<.3);assert.ok(moved.centerY<.4);assert.equal(moved.zoom,4);
  const already={zoom:4,centerX:.14,centerY:.2};assert.deepEqual(toPlain(core.revealTarget(doc,qids[0],already)),already);
  const grouped=core.applyCommand(doc,{type:'GROUP_QUESTIONS',questionIds:[qids[0],qids[1]]},ctx).document;const fit=core.revealTarget(grouped,qids[0],{zoom:4,centerX:.9,centerY:.9});assert.ok(fit.zoom<4);assert.ok(fit.centerX>.2&&fit.centerX<.5);
});
