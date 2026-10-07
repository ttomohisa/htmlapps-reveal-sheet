import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {loadFactory,testContext} from '../helpers/load-factory.mjs';

const core=loadFactory('src/reveal/core.js','createRevealCore')();
const createProjectIO=loadFactory('src/reveal/project-io.js','createProjectIO');
const png=readFileSync('tests/fixtures/images/static.png');

function makeEnvelope(pageCount,maskCount){
  const asset={id:'asset_1',mime:'image/png',width:120,height:80,byteLength:png.length,dataBase64:png.toString('base64')};
  const pages=Array.from({length:pageCount},(_,i)=>({id:`page_${i+1}`,title:`Page ${i+1}`,description:'',imageId:asset.id,questionOrder:[]}));
  const questions=[],masks=[];
  for(let i=0;i<maskCount;i++){
    const page=pages[i%pages.length],qid=`question_${i+1}`,mid=`mask_${i+1}`;
    page.questionOrder.push(qid);
    questions.push({id:qid,pageId:page.id,revision:1,maskIds:[mid],prompt:'',answer:''});
    masks.push({id:mid,pageId:page.id,kind:'answer',questionId:qid,rect:{x:.1,y:.1,w:.2,h:.2}});
  }
  return {format:'reveal-sheet',schemaVersion:1,appVersion:'0.9.0',kind:'editable',document:{id:'document_1',revision:1,title:'Resource fixture',defaults:{mode:'free',otherAnswers:'hidden'},pages,assets:[asset],questions,masks}};
}

test('T18 configured page and cover ceilings accept the boundary and reject the next item',()=>{
  assert.equal(core.limits.maxPages,30);assert.equal(core.limits.maxMasks,1000);
  const atLimit=makeEnvelope(30,1000),accepted=core.validateEnvelope(atLimit);
  assert.equal(accepted.ok,true);assert.equal(atLimit.document.masks.length,1000);
  const overMasks=structuredClone(atLimit);
  overMasks.document.masks.push({id:'mask_1001',pageId:'page_1',kind:'auxiliary',questionId:null,rect:{x:.1,y:.1,w:.2,h:.2}});
  const rejectedMasks=core.validateEnvelope(overMasks);assert.equal(rejectedMasks.ok,false);assert.equal(rejectedMasks.errors[0].code,'LIMIT_EXCEEDED');
  const overPages=structuredClone(atLimit);
  overPages.document.pages.push({id:'page_31',title:'Page 31',description:'',imageId:'asset_1',questionOrder:[]});
  const rejectedPages=core.validateEnvelope(overPages);assert.equal(rejectedPages.ok,false);assert.equal(rejectedPages.errors[0].code,'LIMIT_EXCEEDED');
  assert.throws(()=>core.applyCommand(atLimit.document,{type:'ADD_ANSWER_MASK',pageId:'page_1',rect:{x:.4,y:.4,w:.1,h:.1}},testContext()),error=>error?.code==='LIMIT_EXCEEDED');
});

test('T18 standard 10-page/100-question sheet survives repeated add-delete-export cycles',async()=>{
  const io=createProjectIO({core,imageIO:{verifyStoredAsset:async()=>{}},env:{Blob,TextDecoder,TextEncoder}});
  let doc=makeEnvelope(10,100).document;
  let idSequence=0;const ctx={newId:kind=>`${kind}_cycle_${++idSequence}`,nextRevision:()=>++idSequence};
  const beforeHeap=process.memoryUsage().heapUsed,start=performance.now();let bytes=0;
  for(let i=0;i<20;i++){
    const added=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId:'page_1',rect:{x:.42,y:.42,w:.1,h:.1}},ctx);
    const addedId=added.addedQuestionIds[0];doc=added.document;
    const question=doc.questions.find(item=>item.id===addedId);
    doc=core.applyCommand(doc,{type:'DELETE_MASK',maskId:question.maskIds[0]},ctx).document;
    const blob=io.prepareJson(doc,'0.9.0');bytes=(await blob.arrayBuffer()).byteLength;
    assert.equal(core.validateEnvelope(JSON.parse(await blob.text())).ok,true);
  }
  const elapsedMs=performance.now()-start,heapDelta=process.memoryUsage().heapUsed-beforeHeap;
  assert.equal(core.counts(doc).pages,10);assert.equal(core.counts(doc).masks,100);assert.ok(bytes>0);
  console.log('T18_RESOURCE_OBSERVATION '+JSON.stringify({cycles:20,elapsedMs:Math.round(elapsedMs),heapDelta,outputBytes:bytes}));
});
