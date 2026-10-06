import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadFactory,testContext,toPlain} from '../helpers/load-factory.mjs';

const core=loadFactory('src/reveal/core.js','createRevealCore')();
function documentFixture(title='Sheet'){
  const ctx=testContext(),bytes=fs.readFileSync('tests/fixtures/images/static.png');
  let doc=core.newDocument(ctx,title);
  doc=core.appendAsset(doc,{id:'image_1',mime:'image/png',width:120,height:80,byteLength:bytes.length,dataBase64:bytes.toString('base64')},ctx,'Page 1');
  doc=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId:doc.pages[0].id,rect:{x:.1,y:.1,w:.25,h:.2}},ctx).document;
  return doc;
}
class MemoryBackend{
  constructor(){this.settings={draftOptIn:false,studyOptIn:false};this.draft=null;this.assets=new Map();this.sessions=new Map();this.writeCount=0;this.draftWriteCount=0;this.failProbe=null;this.failNextSave=null;this.clock=0;}
  async probe(){if(this.failProbe)throw this.failProbe;return true;}
  async readSettings(){return {...this.settings};}
  async writeSettings(next){this.writeCount++;this.settings={...this.settings,...next};return {...this.settings};}
  async atomicSaveDraft({expectedGeneration,draft,assets}){
    this.draftWriteCount++;this.writeCount++;
    if(this.failNextSave){const error=this.failNextSave;this.failNextSave=null;throw error;}
    const actual=this.draft?.generation||0;if(expectedGeneration!==actual){const error=new Error('SAVE_CONFLICT');error.code='SAVE_CONFLICT';throw error;}
    const generation=actual+1,savedAt='2026-10-06T00:00:0'+(++this.clock)+'Z';
    this.draft={...structuredClone(draft),generation,savedAt};this.assets=new Map(assets.map(item=>[item.id,{...item}]));return {generation,savedAt};
  }
  async readDraft(){return this.draft?{draft:structuredClone(this.draft),assets:[...this.assets.values()].map(item=>({...item}))}:null;}
  async clearDraft(){this.writeCount++;this.draft=null;this.assets.clear();}
  async atomicSaveSession(){throw new Error('not implemented for T09');}
  async readSession(){return null;}
  async clearSessions(){this.sessions.clear();}
}
function makeStore(backend){const createPersistence=loadFactory('src/reveal/persistence.js','createPersistence',{Blob,structuredClone,DOMException,crypto});return createPersistence({core,env:{Blob,TextEncoder,TextDecoder,crypto,atob,btoa},backend});}

test('T09 draft persistence is opt-in and writes no draft before consent',async()=>{
  const backend=new MemoryBackend(),store=makeStore(backend),doc=documentFixture();
  assert.equal(store.settings.draftOptIn,false);
  assert.equal(await store.saveSnapshot(doc,0),null);
  assert.equal(backend.draftWriteCount,0);
});

test('T09 saveSnapshot separates PNG blobs and reconstructs an identical document',async()=>{
  const backend=new MemoryBackend(),store=makeStore(backend),doc=documentFixture('Local draft');
  await store.setDraftOptIn(true);const receipt=await store.saveSnapshot(doc,0);
  assert.equal(receipt.generation,1);assert.ok(receipt.savedAt);
  assert.equal(backend.draft.document.assets[0].dataBase64,undefined);
  assert.ok(backend.assets.get('image_1').blob instanceof Blob);
  const loaded=await store.loadSnapshot();
  assert.equal(loaded.generation,1);assert.equal(loaded.savedAt,receipt.savedAt);
  assert.deepEqual(toPlain(loaded.document),toPlain(doc));
});

test('T09 two writers from the same generation detect a conflict instead of overwriting',async()=>{
  const backend=new MemoryBackend(),first=makeStore(backend),second=makeStore(backend),doc=documentFixture();
  await first.setDraftOptIn(true);await second.probe();
  await first.saveSnapshot(doc,0);
  await assert.rejects(()=>second.saveSnapshot({...doc,title:'Second tab'},0),error=>error?.code==='SAVE_CONFLICT');
  const loaded=await first.loadSnapshot();assert.equal(loaded.document.title,doc.title);
});

test('T09 quota or aborted save leaves the previous committed snapshot readable',async()=>{
  const backend=new MemoryBackend(),store=makeStore(backend),doc=documentFixture('First');
  await store.setDraftOptIn(true);const first=await store.saveSnapshot(doc,0);
  const quota=new DOMException('full','QuotaExceededError');backend.failNextSave=quota;
  await assert.rejects(()=>store.saveSnapshot({...doc,title:'Broken'},first.generation),error=>error?.code==='LOCAL_SAVE_FAILED');
  const loaded=await store.loadSnapshot();assert.equal(loaded.document.title,'First');assert.equal(loaded.generation,first.generation);
});

test('T09 SecurityError makes local persistence unavailable without blocking the app',async()=>{
  const backend=new MemoryBackend();backend.failProbe=new DOMException('denied','SecurityError');const store=makeStore(backend);
  const capability=await store.probe();assert.deepEqual(toPlain(capability),{available:false,reason:'SecurityError'});
  assert.equal(store.settings.draftOptIn,false);
});
