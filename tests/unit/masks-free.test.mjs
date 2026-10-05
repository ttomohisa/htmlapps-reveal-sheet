import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFactory,toPlain,testContext} from '../helpers/load-factory.mjs';

const createRevealCore=loadFactory('src/reveal/core.js','createRevealCore');
const core=createRevealCore();

function onePageDoc(){
  const ctx=testContext();
  let doc=core.newDocument(ctx,'Sheet');
  doc=core.appendAsset(doc,{id:'asset_1',mime:'image/png',width:1000,height:500,byteLength:4,dataBase64:'AAAA'},ctx,'Page 1');
  return {doc,ctx,pageId:doc.pages[0].id};
}

test('T03 F4 converts normalized rectangles to image pixels',()=>{
  assert.deepEqual(toPlain(core.rectToPixels({x:.1,y:.2,w:.3,h:.1},1000,500)),{x:100,y:100,w:300,h:50});
});

test('T03 creates one answer cover as one question and rejects invalid rectangles',()=>{
  const {doc,ctx,pageId}=onePageDoc();
  const mutation=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId,rect:{x:.1,y:.2,w:.3,h:.1}},ctx);
  assert.equal(mutation.document.masks.length,1);
  assert.equal(mutation.document.questions.length,1);
  assert.deepEqual(toPlain(mutation.document.pages[0].questionOrder),[mutation.document.questions[0].id]);
  assert.equal(mutation.document.questions[0].maskIds[0],mutation.document.masks[0].id);
  assert.throws(()=>core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId,rect:{x:-.1,y:0,w:.2,h:.2}},ctx),{code:'INVALID_SHEET'});
  assert.throws(()=>core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId,rect:{x:0,y:0,w:0,h:.2}},ctx),{code:'INVALID_SHEET'});
});

test('T03 updates cover geometry and deletes its empty question',()=>{
  const {doc,ctx,pageId}=onePageDoc();
  const added=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId,rect:{x:.1,y:.2,w:.3,h:.1}},ctx).document;
  const mask=added.masks[0], question=added.questions[0];
  const moved=core.applyCommand(added,{type:'SET_MASK_RECT',maskId:mask.id,rect:{x:.2,y:.2,w:.3,h:.1}},ctx).document;
  assert.equal(moved.masks[0].rect.x,.2);
  assert.ok(moved.questions[0].revision>question.revision);
  const removed=core.applyCommand(moved,{type:'DELETE_MASK',maskId:mask.id},ctx).document;
  assert.equal(removed.masks.length,0);
  assert.equal(removed.questions.length,0);
  assert.deepEqual(toPlain(removed.pages[0].questionOrder),[]);
});

test('T03 free reveal counts unique confirmed questions, not toggles',()=>{
  const {doc,ctx,pageId}=onePageDoc();
  const withQ=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId,rect:{x:.1,y:.2,w:.3,h:.1}},ctx).document;
  const qid=withQ.questions[0].id;
  let session=core.startSession(withQ,{mode:'free'},ctx);
  assert.deepEqual(toPlain(core.summaryFree(session)),{total:1,confirmed:0});
  session=core.toggleFree(session,qid);
  assert.deepEqual(toPlain(core.summaryFree(session)),{total:1,confirmed:1});
  assert.equal(core.visibilityFor(withQ,session).get(withQ.masks[0].id),false);
  session=core.toggleFree(session,qid);
  assert.deepEqual(toPlain(core.summaryFree(session)),{total:1,confirmed:1});
  assert.equal(core.visibilityFor(withQ,session).get(withQ.masks[0].id),true);
});
