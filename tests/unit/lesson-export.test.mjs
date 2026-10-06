import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadFactory,testContext} from '../helpers/load-factory.mjs';

const core=loadFactory('src/reveal/core.js','createRevealCore')();
const createProjectIO=loadFactory('src/reveal/project-io.js','createProjectIO');

function makeDoc(title='Lesson </script> title'){
  const ctx=testContext(),bytes=fs.readFileSync('tests/fixtures/images/static.png');
  let doc=core.newDocument(ctx,title);
  doc=core.appendAsset(doc,{id:'image_1',mime:'image/png',width:120,height:80,byteLength:bytes.length,dataBase64:bytes.toString('base64')},ctx,'Page </script> 1');
  doc=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId:doc.pages[0].id,rect:{x:.1,y:.2,w:.3,h:.25}},ctx).document;
  return {...doc,ratings:{private:'again'},viewState:{zoom:4},inputFilename:'private.png'};
}
function project(){
  return createProjectIO({core,imageIO:{verifyStoredAsset:async()=>{}},env:{Blob,TextDecoder,TextEncoder}});
}
const playerTemplate='<!doctype html><html><head><meta charset="utf-8"><title>Reveal lesson</title><link rel="icon" href="data:image/svg+xml;base64,PHN2Zy8+"></head><body><main id="lessonApp"><p id="lessonWaiting">Preparing…</p></main><script type="application/json" id="reveal-sheet-data">__REVEAL_LESSON_JSON__</script><script>window.__PLAYER_RUNTIME__=true;</script></body></html>';

test('T11 lesson serialization is whitelisted and never includes author study/editor state',()=>{
  const io=project(),doc=makeDoc(),text=io.serialize(doc,'lesson','0.6.0'),saved=JSON.parse(text);
  assert.equal(saved.kind,'lesson');assert.equal(saved.document.id,doc.id);
  assert.equal('ratings' in saved.document,false);assert.equal('viewState' in saved.document,false);assert.equal('inputFilename' in saved.document,false);
  assert.equal(core.validateEnvelope(saved).ok,true);
});

test('T11 escapeJsonForHtml prevents script/style/comment terminators without changing parsed JSON',()=>{
  const io=project(),raw=JSON.stringify({a:'</script><script>alert(1)</script>',b:'<!--x-->',c:'</style>'});
  assert.equal(typeof io.escapeJsonForHtml,'function');
  const escaped=io.escapeJsonForHtml(raw);
  assert.equal(/<\\/script/i.test(escaped),false);assert.equal(/<\\/style/i.test(escaped),false);assert.equal(escaped.includes('<!--'),false);
  assert.deepEqual(JSON.parse(escaped),JSON.parse(raw));
});

test('T11 prepareHtml embeds exactly one non-executing lesson data tag and no editor-only state',async()=>{
  const io=project(),doc=makeDoc();
  assert.equal(typeof io.prepareHtml,'function');
  const blob=io.prepareHtml(doc,playerTemplate,'0.6.0'),html=await blob.text();
  assert.equal(blob.type,'text/html;charset=utf-8');
  assert.equal((html.match(/id="reveal-sheet-data"/g)||[]).length,1);
  assert.equal(html.includes('__REVEAL_LESSON_JSON__'),false);
  assert.equal(html.includes('"kind":"lesson"'),true);
  assert.equal(html.includes('"ratings"'),false);
  assert.equal(html.includes('id="maskControls"'),false);
  assert.equal(/<script type="application\\/json" id="reveal-sheet-data">[\\s\\S]*?<\\/script>/.test(html),true);
});

test('T11 lesson export rejects sheets without questions and keeps lesson filename normalization',()=>{
  const io=project(),ctx=testContext(),bytes=fs.readFileSync('tests/fixtures/images/static.png');
  let empty=core.newDocument(ctx,'Empty');empty=core.appendAsset(empty,{id:'image_e',mime:'image/png',width:120,height:80,byteLength:bytes.length,dataBase64:bytes.toString('base64')},ctx,'Page');
  assert.throws(()=>io.prepareHtml(empty,playerTemplate,'0.6.0'),{code:'INVALID_SHEET'});
  assert.equal(io.sanitizeFilename('lesson.reveal.html','html'),'lesson.reveal.html');
  assert.equal(io.sanitizeFilename(' a/b ','html'),'a_b.reveal.html');
});
