import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadFactory,testContext,toPlain} from '../helpers/load-factory.mjs';

const core=loadFactory('src/reveal/core.js','createRevealCore')();
function fixture(){
  const ctx=testContext(),bytes=fs.readFileSync('tests/fixtures/images/static.png');
  let doc=core.newDocument(ctx,'Study persistence');
  doc=core.appendAsset(doc,{id:'image_1',mime:'image/png',width:120,height:80,byteLength:bytes.length,dataBase64:bytes.toString('base64')},ctx,'Page 1');
  doc=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId:doc.pages[0].id,rect:{x:.1,y:.1,w:.25,h:.2}},ctx).document;
  doc=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId:doc.pages[0].id,rect:{x:.5,y:.1,w:.25,h:.2}},ctx).document;
  return {doc,ctx,qids:doc.pages[0].questionOrder};
}
class Backend{
  constructor(){this.settings={draftOptIn:false,studyOptIn:false};this.sessions=new Map();this.sessionWrites=0;this.draft={sentinel:true};this.assets=new Map([['x',{x:1}]]);}
  async probe(){return true;} async readSettings(){return {...this.settings};} async writeSettings(v){this.settings={...v};return {...v};}
  async atomicSaveDraft(){throw new Error('unused');} async readDraft(){return null;} async clearDraft(){this.draft=null;this.assets.clear();}
  async atomicSaveSession({key,expectedGeneration,identity,session}){this.sessionWrites++;const current=this.sessions.get(key),actual=current?.generation||0;if(actual!==expectedGeneration){const e=new Error('SAVE_CONFLICT');e.code='SAVE_CONFLICT';throw e;}const receipt={generation:actual+1,savedAt:'2026-10-06T01:00:00Z'};this.sessions.set(key,{identity:structuredClone(identity),session:structuredClone(session),...receipt});return receipt;}
  async readSession(key){return structuredClone(this.sessions.get(key)||null);} async clearSessions(){this.sessions.clear();}
}
function makeStore(backend,cryptoImpl=crypto){const createPersistence=loadFactory('src/reveal/persistence.js','createPersistence',{Blob,structuredClone,DOMException,crypto:cryptoImpl});return createPersistence({core,env:{Blob,TextEncoder,TextDecoder,crypto:cryptoImpl,atob,btoa},backend});}
async function identity(store,doc){return {documentId:doc.id,revision:doc.revision,fingerprint:await store.fingerprintDocument(doc)};}

test('T10 document fingerprint uses canonical object-key ordering and changes with document content',async()=>{
  const backend=new Backend(),store=makeStore(backend),{doc}=fixture();
  const reordered={masks:doc.masks,questions:doc.questions,assets:doc.assets,pages:doc.pages,defaults:doc.defaults,title:doc.title,revision:doc.revision,id:doc.id};
  const first=await store.fingerprintDocument(doc),second=await store.fingerprintDocument(reordered),changed=await store.fingerprintDocument({...doc,title:'Different'});
  assert.match(first,/^[0-9a-f]{64}$/);assert.equal(second,first);assert.notEqual(changed,first);
});

test('T10 study persistence is a separate opt-in and writes nothing before consent',async()=>{
  const backend=new Backend(),store=makeStore(backend),{doc,ctx}=fixture(),session=core.startSession(doc,{mode:'guided'},ctx),id=await identity(store,doc);
  assert.equal(store.settings.studyOptIn,false);assert.equal(await store.saveSession(id,session,0),null);assert.equal(backend.sessionWrites,0);
  await store.setStudyOptIn(true);assert.equal(store.settings.studyOptIn,true);assert.equal(store.settings.draftOptIn,false);
  const receipt=await store.saveSession(id,session,0);assert.equal(receipt.generation,1);assert.equal(backend.sessionWrites,1);
});

test('T10 resume requires document id revision and fingerprint to all match',async()=>{
  const backend=new Backend(),store=makeStore(backend),{doc,ctx}=fixture();await store.setStudyOptIn(true);
  const id=await identity(store,doc),session=core.startSession(doc,{mode:'guided'},ctx);await store.saveSession(id,session,0);
  assert.ok(await store.loadSession(id));
  assert.equal(await store.loadSession({...id,revision:id.revision+1}),null);
  assert.equal(await store.loadSession({...id,fingerprint:'0'.repeat(64)}),null);
  assert.equal(await store.loadSession({...id,documentId:'other_document'}),null);
});

test('T10 resumed guided/free sessions always start with answers closed while keeping progress',async()=>{
  const backend=new Backend(),store=makeStore(backend),{doc,ctx,qids}=fixture();await store.setStudyOptIn(true);const id=await identity(store,doc);
  let guided=core.startSession(doc,{mode:'guided'},ctx);guided=core.revealCurrent(guided,guided.epoch);assert.equal(guided.stage,'revealed');await store.saveSession(id,guided,0);
  let loaded=await store.loadSession(id);assert.equal(loaded.session.stage,'hidden');assert.equal(loaded.session.index,0);
  await backend.clearSessions();
  let free=core.startSession(doc,{mode:'free'},ctx);free=core.toggleFree(free,qids[0]);assert.equal(free.openQuestionIds.length,1);await store.saveSession(id,free,0);
  loaded=await store.loadSession(id);assert.deepEqual(toPlain(loaded.session.openQuestionIds),[]);assert.deepEqual(toPlain(loaded.session.confirmedQuestionIds),[qids[0]]);
});

test('T10 study records contain no image bytes or document payload',async()=>{
  const backend=new Backend(),store=makeStore(backend),{doc,ctx}=fixture();await store.setStudyOptIn(true);const id=await identity(store,doc),session=core.startSession(doc,{mode:'guided'},ctx);await store.saveSession(id,session,0);
  const record=backend.sessions.get(doc.id),text=JSON.stringify(record);assert.equal('document' in record,false);assert.equal(text.includes('dataBase64'),false);assert.equal(text.includes('iVBOR'),false);
});

test('T10 missing Web Crypto disables fingerprint/session persistence but leaves study in memory',async()=>{
  const backend=new Backend(),store=makeStore(backend,null),{doc,ctx}=fixture();await store.probe();await store.setStudyOptIn(true);
  assert.equal(await store.fingerprintDocument(doc),null);const session=core.startSession(doc,{mode:'guided'},ctx);
  assert.equal(await store.saveSession({documentId:doc.id,revision:doc.revision,fingerprint:null},session,0),null);assert.equal(backend.sessionWrites,0);
});

test('T10 clearing study data is namespace-limited and does not clear a saved draft',async()=>{
  const backend=new Backend(),store=makeStore(backend),{doc,ctx}=fixture();await store.setStudyOptIn(true);const id=await identity(store,doc);await store.saveSession(id,core.startSession(doc,{mode:'guided'},ctx),0);
  await store.clearLocal('study');assert.equal(backend.sessions.size,0);assert.deepEqual(backend.draft,{sentinel:true});assert.equal(backend.assets.size,1);assert.equal(store.settings.studyOptIn,false);
});

test('T10 edited content with the same document id starts a separate study-record generation',async()=>{
  const backend=new Backend(),store=makeStore(backend),{doc,ctx}=fixture();await store.setStudyOptIn(true);
  const firstId=await identity(store,doc),session=core.startSession(doc,{mode:'guided'},ctx);await store.saveSession(firstId,session,0);
  const changed={...doc,revision:doc.revision+1,title:'Edited content'},secondId=await identity(store,changed);
  const receipt=await store.saveSession(secondId,core.startSession(changed,{mode:'guided'},ctx),0);
  assert.equal(receipt.generation,1);assert.notEqual(firstId.fingerprint,secondId.fingerprint);assert.equal(backend.sessions.size,2);
});
