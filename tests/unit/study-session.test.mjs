import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadFactory,testContext,toPlain} from '../helpers/load-factory.mjs';

const core=loadFactory('src/reveal/core.js','createRevealCore')();
function fixture(){
  const ctx=testContext(),bytes=fs.readFileSync('tests/fixtures/images/static.png');
  let doc=core.newDocument(ctx,'Guided');
  doc=core.appendAsset(doc,{id:'image_1',mime:'image/png',width:120,height:80,byteLength:bytes.length,dataBase64:bytes.toString('base64')},ctx,'Page 1');
  const pageId=doc.pages[0].id;
  for(const x of [.05,.35,.65]) doc=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId,rect:{x,y:.2,w:.18,h:.2}},ctx).document;
  return {doc,ctx,qids:doc.pages[0].questionOrder};
}

test('T07 guided queue snapshots question revisions and starts hidden',()=>{
  const {doc,ctx,qids}=fixture();
  const session=core.startSession(doc,{mode:'guided',otherAnswers:'hidden'},ctx);
  assert.equal(session.mode,'guided');
  assert.deepEqual(toPlain(session.queue),toPlain(qids.map(id=>({questionId:id,questionRevision:1}))));
  assert.equal(session.index,0);assert.equal(session.stage,'hidden');assert.equal(session.epoch,1);
  assert.deepEqual(toPlain(core.summary(session)),{total:3,recalled:0,again:0,skipped:0,unanswered:3});
});

test('T07 reveal is required before rating and duplicate epochs are harmless',()=>{
  const {doc,ctx,qids}=fixture();let session=core.startSession(doc,{mode:'guided',otherAnswers:'hidden'},ctx);
  assert.throws(()=>core.rate(session,qids[0],'recalled',session.epoch),{code:'INVALID_STUDY_ACTION'});
  const epoch=session.epoch;session=core.revealCurrent(session,epoch);assert.equal(session.stage,'revealed');
  assert.strictEqual(core.revealCurrent(session,epoch),session);
  session=core.rate(session,qids[0],'recalled',epoch);assert.equal(session.index,1);assert.equal(session.stage,'hidden');assert.equal(session.ratings[qids[0]],'recalled');
  assert.strictEqual(core.rate(session,qids[0],'again',epoch),session);
  assert.deepEqual(toPlain(core.summary(session)),{total:3,recalled:1,again:0,skipped:0,unanswered:2});
});

test('T07 skip works before or after reveal and reassessment overwrites one question',()=>{
  const {doc,ctx,qids}=fixture();let session=core.startSession(doc,{mode:'guided'},ctx);
  session=core.skip(session,session.epoch);assert.equal(session.ratings[qids[0]],'skipped');
  session=core.revealCurrent(session,session.epoch);session=core.rate(session,qids[1],'again',session.epoch);
  session=core.goToQuestion(session,qids[1]);assert.equal(session.stage,'hidden');assert.equal(session.ratings[qids[1]],'again');
  session=core.revealCurrent(session,session.epoch);session=core.rate(session,qids[1],'recalled',session.epoch);
  assert.deepEqual(toPlain(core.summary(session)),{total:3,recalled:1,again:0,skipped:1,unanswered:1});
});

test('T07 visibility honors other-answer setting but current and auxiliary covers stay closed initially',()=>{
  const {doc:initial,ctx,qids}=fixture();
  const thirdMask=initial.masks.find(mask=>mask.questionId===qids[2]);
  const doc=core.applyCommand(initial,{type:'CONVERT_MASK_KIND',maskId:thirdMask.id,kind:'auxiliary'},ctx).document;
  const hidden=core.startSession(doc,{mode:'guided',otherAnswers:'hidden'},ctx),visible=core.startSession(doc,{mode:'guided',otherAnswers:'visible'},ctx);
  const currentId=hidden.queue[0].questionId,currentMask=doc.masks.find(mask=>mask.questionId===currentId),otherMask=doc.masks.find(mask=>mask.kind==='answer'&&mask.questionId!==currentId),aux=doc.masks.find(mask=>mask.kind==='auxiliary');
  assert.equal(core.visibilityFor(doc,hidden).get(currentMask.id),true);assert.equal(core.visibilityFor(doc,hidden).get(otherMask.id),true);assert.equal(core.visibilityFor(doc,hidden).get(aux.id),true);
  assert.equal(core.visibilityFor(doc,visible).get(currentMask.id),true);assert.equal(core.visibilityFor(doc,visible).get(otherMask.id),false);assert.equal(core.visibilityFor(doc,visible).get(aux.id),true);
  const revealed=core.revealCurrent(visible,visible.epoch);assert.equal(core.visibilityFor(doc,revealed).get(currentMask.id),false);assert.equal(core.visibilityFor(doc,revealed).get(aux.id),true);
});

test('T07 result summary, early finish, again review and unchecked review keep separate denominators',()=>{
  const {doc,ctx,qids}=fixture();let session=core.startSession(doc,{mode:'guided'},ctx);
  session=core.revealCurrent(session,session.epoch);session=core.rate(session,qids[0],'recalled',session.epoch);
  session=core.revealCurrent(session,session.epoch);session=core.rate(session,qids[1],'again',session.epoch);
  session=core.skip(session,session.epoch);
  assert.deepEqual(toPlain(core.summary(session)),{total:3,recalled:1,again:1,skipped:1,unanswered:0});
  const again=core.makeReviewSession(doc,session,'again',ctx);assert.deepEqual(toPlain(again.queue.map(x=>x.questionId)),[qids[1]]);assert.deepEqual(toPlain(core.summary(again)),{total:1,recalled:0,again:0,skipped:0,unanswered:1});
  const unchecked=core.makeReviewSession(doc,session,'unchecked',ctx);assert.deepEqual(toPlain(unchecked.queue.map(x=>x.questionId)),[qids[2]]);assert.equal(core.makeReviewSession(doc,{...session,ratings:Object.fromEntries(qids.map(id=>[id,'recalled']))},'again',ctx),null);

  let early=core.startSession(doc,{mode:'guided'},ctx);early=core.revealCurrent(early,early.epoch);early=core.finishSession(early,early.epoch);
  assert.deepEqual(toPlain(core.summary(early)),{total:3,recalled:0,again:0,skipped:0,unanswered:3});
});

test('T07 free study remains confirmation-only and starts over at zero',()=>{
  const {doc,ctx,qids}=fixture();let free=core.startSession(doc,{mode:'free'},ctx);free=core.toggleFree(free,qids[0]);
  assert.deepEqual(toPlain(core.summaryFree(free)),{total:3,confirmed:1});
  free=core.startSession(doc,{mode:'free'},ctx);assert.deepEqual(toPlain(core.summaryFree(free)),{total:3,confirmed:0});
});
