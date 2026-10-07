import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadFactory,testContext,toPlain} from '../helpers/load-factory.mjs';

const index=fs.readFileSync('src/index.template.html','utf8');
const player=fs.readFileSync('src/reveal/player.js','utf8');
const core=loadFactory('src/reveal/core.js','createRevealCore')();

function translationKeys(block){
  return new Set([...block.matchAll(/(?:^|[,\n])\s*([A-Za-z0-9_]+):/g)].map(match=>match[1]));
}
function translationBlocks(source){
  const jaStart=source.indexOf('ja: {'),enStart=source.indexOf('en: {',jaStart+1);
  assert.notEqual(jaStart,-1);assert.notEqual(enStart,-1);
  const end=source.indexOf('\n      };',enStart);
  return {ja:source.slice(jaStart,enStart),en:source.slice(enStart,end)};
}

test('T16 main UI translation keys stay complete across Japanese and English',()=>{
  const {ja,en}=translationBlocks(index),jaKeys=translationKeys(ja),enKeys=translationKeys(en);
  jaKeys.delete('ja');enKeys.delete('en');
  const missingInEn=[...jaKeys].filter(key=>!enKeys.has(key));
  const missingInJa=[...enKeys].filter(key=>!jaKeys.has(key));
  assert.deepEqual(missingInEn,[]);
  assert.deepEqual(missingInJa,[]);
  for(const key of ['coverColor','editorGuide','zoomControlsLabel','zoomIn','zoomOut','fitView','studyPanelLabel','questionsLabel','guidedQuestionsLabel','imageCoversLabel','coversLabel','previewCoversLabel','coverLabel','coveredAnswerLabel','helpAccessibilityTitle','helpAccessibilityBody']){
    assert.equal(jaKeys.has(key),true,key+' missing in ja');
    assert.equal(enKeys.has(key),true,key+' missing in en');
  }
});

test('T16 user-facing landmark and overlay labels are localized rather than fixed English',()=>{
  for(const key of ['zoomControlsLabel','studyPanelLabel','questionsLabel','guidedQuestionsLabel','imageCoversLabel','coversLabel','previewCoversLabel']){
    assert.match(index,new RegExp('data-i18n-aria-label="'+key+'"'));
  }
  assert.match(player,/translate:t/);
  assert.match(player,/coveredAnswerLabel/);
  assert.match(player,/coverLabel/);
});

test('T16 repeated keyboard events cannot advance guided study repeatedly',()=>{
  assert.match(player,/event\.repeat/);
  assert.match(player,/\[' ',\s*'1',\s*'2',\s*'s',\s*'S',\s*'ArrowLeft'\]/);
});

test('T16 help explicitly states the image-text accessibility limitation',()=>{
  assert.match(index,/helpAccessibilityTitle/);
  assert.match(index,/画像そのものに写っている答えの文字を自動で読み上げる機能ではありません/);
  assert.match(index,/does not automatically read text that exists only inside image pixels/);
});

test('T16 closed answer copy is not used as an overlay accessible name',()=>{
  assert.doesNotMatch(player,/aria-label[^\n]*(?:q\?\.answer|question\.answer|\.answer)/);
  assert.doesNotMatch(index,/aria-label="[^"]*\{answer\}/);
});


function textDoc(){
  const ctx=testContext();let doc=core.newDocument(ctx,'Text sheet');
  doc=core.appendAsset(doc,{id:'image_text',mime:'image/png',width:100,height:100,byteLength:1,dataBase64:'AA=='},ctx,'Page');
  doc=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId:doc.pages[0].id,rect:{x:.1,y:.1,w:.2,h:.2}},ctx).document;
  return {ctx,doc};
}

test('T16 optional prompt and answer edits advance only the affected question revision',()=>{
  const {ctx,doc}=textDoc(),qid=doc.questions[0].id,revision=doc.questions[0].revision;
  const result=core.applyCommand(doc,{type:'SET_QUESTION_TEXT',questionId:qid,prompt:'Prompt text',answer:'Secret answer'},ctx);
  assert.deepEqual(toPlain(result.affectedQuestionIds),[qid]);
  assert.equal(result.document.questions[0].revision,revision+1);
  assert.equal(result.document.questions[0].prompt,'Prompt text');
  assert.equal(result.document.questions[0].answer,'Secret answer');
  assert.throws(()=>core.applyCommand(result.document,{type:'SET_QUESTION_TEXT',questionId:qid,prompt:'x'.repeat(2001),answer:''},ctx),{code:'LIMIT_EXCEEDED'});
});

test('T16 page description edits invalidate every question on that page',()=>{
  const {ctx,doc}=textDoc(),qid=doc.questions[0].id,revision=doc.questions[0].revision;
  const result=core.applyCommand(doc,{type:'SET_PAGE_DESCRIPTION',pageId:doc.pages[0].id,description:'Context only'},ctx);
  assert.deepEqual(toPlain(result.affectedQuestionIds),[qid]);
  assert.equal(result.document.pages[0].description,'Context only');
  assert.equal(result.document.questions[0].revision,revision+1);
});
