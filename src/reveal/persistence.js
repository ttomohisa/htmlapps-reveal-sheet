/** Opt-in local persistence for Reveal Sheet. IndexedDB is the browser backend; tests may inject an atomic backend. */
function createPersistence({core,env,backend=null}) {
  const settings={draftOptIn:false,studyOptIn:false};
  let capability=null;
  const db=backend||createIndexedDbBackend(env);
  function appError(code,cause=null){const error=new Error(code);error.code=code;if(cause)error.cause=cause;return error;}
  function normalizeFailure(error){if(error?.code==='SAVE_CONFLICT')return error;return appError('LOCAL_SAVE_FAILED',error);}
  function base64ToBytes(base64){const binary=env.atob(base64),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
  function bytesToBase64(bytes){let binary='',step=0x8000;for(let i=0;i<bytes.length;i+=step)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+step,bytes.length)));return env.btoa(binary);}
  function stripDocument(doc){return {...doc,assets:doc.assets.map(({dataBase64,...asset})=>({...asset}))};}
  function assetRecords(doc){return doc.assets.map(asset=>({id:asset.id,mime:asset.mime,width:asset.width,height:asset.height,byteLength:asset.byteLength,blob:new env.Blob([base64ToBytes(asset.dataBase64)],{type:asset.mime})}));}
  async function reconstruct(stored){
    if(!stored)return null;const byId=new Map(stored.assets.map(asset=>[asset.id,asset])),assets=[];
    for(const meta of stored.draft.document.assets){const saved=byId.get(meta.id);if(!saved||!(saved.blob instanceof env.Blob))throw appError('LOCAL_SAVE_FAILED');const bytes=new Uint8Array(await saved.blob.arrayBuffer());if(bytes.byteLength!==meta.byteLength)throw appError('LOCAL_SAVE_FAILED');assets.push({...meta,dataBase64:bytesToBase64(bytes)});}
    const document={...stored.draft.document,assets},validation=core.validateEnvelope({format:'reveal-sheet',schemaVersion:1,appVersion:'0.0.0',kind:'editable',document});if(!validation.ok)throw appError('LOCAL_SAVE_FAILED');
    return {document,generation:stored.draft.generation,savedAt:stored.draft.savedAt};
  }
  async function probe(){
    try{await db.probe();const saved=await db.readSettings();settings.draftOptIn=Boolean(saved?.draftOptIn);settings.studyOptIn=Boolean(saved?.studyOptIn);capability={available:true};return {...capability};}
    catch(error){settings.draftOptIn=false;settings.studyOptIn=false;capability={available:false,reason:error?.name||error?.code||'Unavailable'};return {...capability};}
  }
  async function ensureAvailable(){const result=capability?.available?capability:await probe();if(!result.available)throw appError('LOCAL_SAVE_FAILED');}
  async function persistSettings(){await ensureAvailable();try{await db.writeSettings(settings);}catch(error){throw normalizeFailure(error);}return {...settings};}
  async function setDraftOptIn(enabled){await ensureAvailable();const previous=settings.draftOptIn;settings.draftOptIn=Boolean(enabled);try{return await db.writeSettings(settings);}catch(error){settings.draftOptIn=previous;throw normalizeFailure(error);}}
  async function setStudyOptIn(enabled){await ensureAvailable();const previous=settings.studyOptIn;settings.studyOptIn=Boolean(enabled);try{return await db.writeSettings(settings);}catch(error){settings.studyOptIn=previous;throw normalizeFailure(error);}}
  async function saveSnapshot(doc,expectedGeneration=0){
    if(!settings.draftOptIn)return null;if(!doc?.pages?.length)return null;await ensureAvailable();
    const draft={document:stripDocument(doc)};try{return await db.atomicSaveDraft({expectedGeneration,draft,assets:assetRecords(doc)});}catch(error){throw normalizeFailure(error);}
  }
  async function loadSnapshot(){await ensureAvailable();try{return await reconstruct(await db.readDraft());}catch(error){throw normalizeFailure(error);}}
  async function clearLocal(scope='draft'){
    await ensureAvailable();try{if(scope==='draft'||scope==='all'){await db.clearDraft();settings.draftOptIn=false;}if(scope==='study'||scope==='all'){await db.clearSessions();settings.studyOptIn=false;}await db.writeSettings(settings);}catch(error){throw normalizeFailure(error);}
  }
  return Object.freeze({settings,probe,setDraftOptIn,setStudyOptIn,saveSnapshot,loadSnapshot,clearLocal,
    // T10 methods are attached in the next task.
    async fingerprintDocument(){return null;},async saveSession(){return null;},async loadSession(){return null;}
  });

  function createIndexedDbBackend(runtime){
    if(!runtime?.indexedDB) return {async probe(){throw new DOMException('IndexedDB unavailable','SecurityError');}};
    const DB_NAME='reveal-sheet',DB_VERSION=1;
    function open(){return new Promise((resolve,reject)=>{let request;try{request=runtime.indexedDB.open(DB_NAME,DB_VERSION);}catch(error){reject(error);return;}request.onupgradeneeded=()=>{const db=request.result;for(const name of ['draft','assets','sessions','settings'])if(!db.objectStoreNames.contains(name))db.createObjectStore(name);};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('IndexedDB open failed'));request.onblocked=()=>reject(new DOMException('IndexedDB blocked','AbortError'));});}
    function req(request){return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('IndexedDB request failed'));});}
    function done(tx){return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new DOMException('Transaction aborted','AbortError'));tx.onerror=()=>{};});}
    return {
      async probe(){const database=await open();database.close();return true;},
      async readSettings(){const database=await open();try{const tx=database.transaction('settings','readonly'),value=await req(tx.objectStore('settings').get('settings'));await done(tx);return value||{draftOptIn:false,studyOptIn:false};}finally{database.close();}},
      async writeSettings(next){const database=await open();try{const tx=database.transaction('settings','readwrite');tx.objectStore('settings').put({...next},'settings');await done(tx);return {...next};}finally{database.close();}},
      async atomicSaveDraft({expectedGeneration,draft,assets}){const database=await open();try{return await new Promise((resolve,reject)=>{const tx=database.transaction(['draft','assets'],'readwrite'),draftStore=tx.objectStore('draft'),assetStore=tx.objectStore('assets');let receipt=null,settled=false;const fail=error=>{if(settled)return;settled=true;try{tx.abort();}catch{}reject(error);};const get=draftStore.get('current');get.onerror=()=>fail(get.error||new Error('Draft read failed'));get.onsuccess=()=>{const actual=get.result?.generation||0;if(actual!==expectedGeneration){const conflict=appError('SAVE_CONFLICT');fail(conflict);return;}const generation=actual+1,savedAt=new Date().toISOString();receipt={generation,savedAt};assetStore.clear();for(const asset of assets)assetStore.put(asset,asset.id);draftStore.put({...draft,generation,savedAt},'current');};tx.oncomplete=()=>{if(!settled){settled=true;resolve(receipt);}};tx.onabort=()=>{if(!settled){settled=true;reject(tx.error||new DOMException('Transaction aborted','AbortError'));}};tx.onerror=()=>{};});}finally{database.close();}},
      async readDraft(){const database=await open();try{const tx=database.transaction(['draft','assets'],'readonly'),draftPromise=req(tx.objectStore('draft').get('current')),assetsPromise=req(tx.objectStore('assets').getAll()),draft=await draftPromise,assets=await assetsPromise;await done(tx);return draft?{draft,assets}:null;}finally{database.close();}},
      async clearDraft(){const database=await open();try{const tx=database.transaction(['draft','assets'],'readwrite');tx.objectStore('draft').clear();tx.objectStore('assets').clear();await done(tx);}finally{database.close();}},
      async atomicSaveSession(){throw appError('LOCAL_SAVE_FAILED');},
      async readSession(){return null;},
      async clearSessions(){const database=await open();try{const tx=database.transaction('sessions','readwrite');tx.objectStore('sessions').clear();await done(tx);}finally{database.close();}}
    };
  }
}
