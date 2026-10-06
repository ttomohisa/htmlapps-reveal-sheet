import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadFactory,testContext,toPlain} from '../helpers/load-factory.mjs';

const core=loadFactory('src/reveal/core.js','createRevealCore')();
const createProjectIO=loadFactory('src/reveal/project-io.js','createProjectIO');
const START='<script id="reveal-sheet-data" type="application/json">';

function makeDoc(title='</script><img src=x onerror=alert(1)>'){
  const ctx=testContext(),bytes=fs.readFileSync('tests/fixtures/images/static.png');
  let doc=core.newDocument(ctx,title);
  doc=core.appendAsset(doc,{id:'image_1',mime:'image/png',width:120,height:80,byteLength:bytes.length,dataBase64:bytes.toString('base64')},ctx,'Page 1');
  doc=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId:doc.pages[0].id,rect:{x:.1,y:.2,w:.3,h:.25}},ctx).document;
  return doc;
}
function project({verify=async()=>{},domParser=undefined}={}){
  return createProjectIO({core,imageIO:{verifyStoredAsset:verify},env:{Blob,TextDecoder,TextEncoder,DOMParser:domParser}});
}
function lessonHtml(io,doc=makeDoc()){
  const json=io.escapeJsonForHtml(io.serialize(doc,'lesson','0.6.0'));
  return '<!doctype html><html><head><img src="https://invalid.example/a.png"><style>x{background:url(https://invalid.example/b.png)}</style></head><body><script>globalThis.pwned=true</script>'+START+json+'</script><iframe src="https://invalid.example/c"></iframe></body></html>';
}

test('T12 extractLessonEnvelope reads only the fixed data tag and preserves hostile-looking text',()=>{
  let parserCalls=0;const io=project({domParser:class{constructor(){parserCalls++;throw new Error('must not construct DOM');}}}),doc=makeDoc(),html=lessonHtml(io,doc);
  assert.equal(typeof io.extractLessonEnvelope,'function');
  const value=io.extractLessonEnvelope(html);
  assert.equal(value.kind,'lesson');assert.equal(value.document.id,doc.id);assert.equal(value.document.title,doc.title);assert.equal(parserCalls,0);
});

test('T12 extractLessonEnvelope rejects missing duplicate or incomplete fixed tags',()=>{
  const io=project(),html=lessonHtml(io),start=html.indexOf(START),end=html.indexOf('</script>',start+START.length),block=html.slice(start,end+9);
  assert.throws(()=>io.extractLessonEnvelope(html.replace(block,'')),{code:'INVALID_SHEET'});
  assert.throws(()=>io.extractLessonEnvelope(html.replace('</body>',block+'</body>')),{code:'INVALID_SHEET'});
  assert.throws(()=>io.extractLessonEnvelope(html.slice(0,end)),{code:'INVALID_SHEET'});
  assert.throws(()=>io.extractLessonEnvelope(html.replace('"kind":"lesson"','"kind":"editable"')),{code:'INVALID_SHEET'});
});

test('T12 readHtml validates embedded PNGs then returns editable data without evaluating outer HTML',async()=>{
  let verified=0,parserCalls=0;const io=project({verify:async()=>{verified++;},domParser:class{constructor(){parserCalls++;throw new Error('must not construct DOM');}}}),doc=makeDoc(),html=lessonHtml(io,doc);
  const file=new Blob([html],{type:'text/html'});Object.defineProperty(file,'name',{value:'safe.reveal.html'});
  const loaded=await io.readHtml(file);
  assert.equal(verified,1);assert.equal(parserCalls,0);assert.equal(loaded.kind,'editable');assert.equal(loaded.document.id,doc.id);assert.deepEqual(toPlain(loaded.document),toPlain(doc));
});

test('T12 readSheet selects HTML by filename and rejects over-limit HTML before decoding',async()=>{
  const io=project(),doc=makeDoc(),html=lessonHtml(io,doc),file=new Blob([html],{type:'text/html'});Object.defineProperty(file,'name',{value:'SAFE.REVEAL.HTML'});
  assert.equal((await io.readSheet(file)).document.id,doc.id);
  const huge={name:'huge.reveal.html',size:core.limits.maxHtmlBytes+1,arrayBuffer:async()=>{throw new Error('must not read');}};
  await assert.rejects(io.readHtml(huge),{code:'LIMIT_EXCEEDED'});
});

test('T12 JSON strings containing escaped fixed-tag text do not create a second data tag',()=>{
  const io=project(),doc=makeDoc(START+'</script>'),html=lessonHtml(io,doc);
  const value=io.extractLessonEnvelope(html);assert.equal(value.document.title,START+'</script>');
  assert.equal(html.split(START).length-1,1);
});
