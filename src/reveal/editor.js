/** The foundation editor owns transient document and asynchronous input state.
 * No draft/session storage is used in v0.1.0. Files never leave this page.
 */
function createEditor({core,imageIO,env,translate,getLanguage}) {
  const $ = id => env.document.getElementById(id);
  const ctx={newId:kind=>kind+'_'+Array.from(env.crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('')};
  let doc=core.newDocument(ctx,translate('untitled'));
  let selectedId=null, generation=0, batchId=0, displayGeneration=0;
  let controller=null, busy=false, failures=[], progress=null;
  let undo=[],redo=[],viewKey='',lastStatus='emptyStatus';
  const image=$('previewImage');
  const t=translate;
  function status(key, params={}) {
    lastStatus=key; progress=Object.keys(params).length?params:null;
    $('inputStatus').textContent=t(key,params);
  }
  function refreshCopy() {
    env.document.body.classList.toggle('has-pages',doc.pages.length>0);
    $('developmentNote').textContent=t(doc.pages.length?'loadedDevelopmentNote':'developmentNote');
    $('sheetTitle').textContent=doc.title;
    $('sheetCount').textContent=t('pageCount',{count:doc.pages.length});
    $('inputStatus').textContent=t(lastStatus,progress||{});
    $('newButton').disabled=!doc.pages.length&&!busy;
    $('addButton').disabled=busy||doc.pages.length>=core.limits.maxPages;
    $('imageInput').disabled=busy;
    $('cancelButton').hidden=!busy;
    $('undoButton').disabled=busy||undo.length===0;
    $('redoButton').disabled=busy||redo.length===0;
    $('emptyPreview').hidden=doc.pages.length!==0;
    $('imageMeta').hidden=!selectedId;
    $('loadedSection').hidden=doc.pages.length===0;
    $('pageList').replaceChildren();
    for(const p of doc.pages){
      const a=doc.assets.find(x=>x.id===p.imageId);
      const button=env.document.createElement('button');button.type='button';button.className='page-item';button.disabled=busy;
      button.setAttribute('aria-pressed',String(p.id===selectedId));
      const name=env.document.createElement('span');name.className='page-name';name.textContent=p.title;
      const details=env.document.createElement('span');details.className='page-details';details.textContent=`${a.width} × ${a.height} · ${formatBytes(a.byteLength)}`;
      button.append(name,details);button.addEventListener('click',()=>{selectedId=p.id;refreshCopy();showPreview();});$('pageList').append(button);
    }
    $('failureSection').hidden=failures.length===0;
    $('failureList').replaceChildren();
    for(const failure of failures){
      const li=env.document.createElement('li'),name=env.document.createElement('strong'),reason=env.document.createElement('span');
      name.textContent=failure.name;reason.textContent=t('error_'+failure.code);li.append(name,reason);$('failureList').append(li);
    }
    const page=doc.pages.find(p=>p.id===selectedId),asset=page&&doc.assets.find(a=>a.id===page.imageId);
    if(asset){$('imageDimensions').textContent=`${asset.width} × ${asset.height} px`;$('imageBytes').textContent=formatBytes(asset.byteLength);}
    $('totalBytes').textContent=formatBytes(doc.assets.reduce((sum,a)=>sum+a.byteLength,0));
    $('outputFilename').value=doc.title===t('untitled')?'reveal-sheet':doc.title;
  }
  function formatBytes(bytes){return bytes<1024?`${bytes} B`:bytes<1024**2?`${(bytes/1024).toFixed(1)} KiB`:`${(bytes/1024**2).toFixed(1)} MiB`;}
  async function showPreview(force=false) {
    const page=doc.pages.find(p=>p.id===selectedId),asset=page&&doc.assets.find(a=>a.id===page.imageId);
    if(!asset){viewKey='';displayGeneration++;image.hidden=true;image.removeAttribute('src');$('previewWait').hidden=true;return;}
    if(!force&&viewKey===asset.id)return;
    viewKey=asset.id;const token=++displayGeneration,sourceGeneration=generation;
    image.hidden=true;$('previewWait').hidden=false;$('previewWait').textContent=t('preparing');
    try {
      image.src=imageIO.urlFor(asset);
      await image.decode();
      if(token!==displayGeneration||sourceGeneration!==generation)return;
      image.alt=t('imageAlt',{name:page.title});image.hidden=false;$('previewWait').hidden=true;
    }catch{
      if(token!==displayGeneration||sourceGeneration!==generation)return;
      image.hidden=true;image.removeAttribute('src');viewKey='';$('previewWait').textContent=t('error_DECODE_FAILED');
    }
  }
  function commit(next) {
    undo.push(doc);if(undo.length>core.limits.maxUndo)undo.shift();redo=[];doc=next;
  }
  function history(direction) {
    if(busy)return;
    const from=direction==='undo'?undo:redo,to=direction==='undo'?redo:undo;
    if(!from.length)return;
    to.push(doc);doc={...from.pop(),revision:doc.revision+1};
    if(!doc.pages.some(p=>p.id===selectedId))selectedId=doc.pages.at(-1)?.id||null;
    status(direction==='undo'?'undone':'redone');refreshCopy();showPreview();
  }
  async function addImages(input) {
    if(busy)return;
    const files=Array.from(input);if(!files.length)return;
    // A cancelled decoder must settle before another is started. This prevents
    // two costly decodes overlapping after a quick Cancel -> Add sequence.
    busy=true;const currentBatch=++batchId,currentGeneration=generation;
    controller=new env.AbortController();const signal=controller.signal;
    failures=[];let added=0,done=0;
    status('processing',{done:0,total:files.length});refreshCopy();
    for(const file of files){
      if(signal.aborted||currentGeneration!==generation||currentBatch!==batchId)break;
      try {
        if(doc.pages.length>=core.limits.maxPages)throw core.error('LIMIT_EXCEEDED');
        const asset=await imageIO.normalize(file,{signal,ctx});
        if(signal.aborted||currentGeneration!==generation||currentBatch!==batchId)break;
        commit(core.appendAsset(doc,asset,ctx,t('pageName',{number:doc.pages.length+1})));
        selectedId=doc.pages.at(-1).id;added++;
      } catch(error) {
        if(signal.aborted||currentGeneration!==generation||currentBatch!==batchId)break;
        const code=['UNSUPPORTED_IMAGE','ANIMATED_IMAGE','IMAGE_TOO_LARGE','DECODE_FAILED','LIMIT_EXCEEDED'].includes(error.code)?error.code:'DECODE_FAILED';
        failures.push({name:String(file.name||t('unnamedImage')),code});
      }
      done++;status('processing',{done,total:files.length});refreshCopy();
      // Display decoding uses the already normalized PNG; await it so full
      // input and display decoding are never intentionally run in parallel.
      await showPreview();
      await new Promise(resolve=>env.setTimeout(resolve,0));
    }
    if(currentBatch===batchId){
      busy=false;controller=null;
      if(currentGeneration===generation){
        status(signal.aborted?'cancelledStatus':failures.length?'partialStatus':'addedStatus',{added,failed:failures.length});
      }
      refreshCopy();
    }
    // File objects and original filenames only live in this temporary batch.
  }
  async function startNew() {
    if(!doc.pages.length&&!busy)return;
    const yes=await env.AppConfirm.ask({title:t('newTitle'),message:t('newMessage',{count:doc.pages.length}),confirmLabel:t('newAction'),cancelLabel:t('cancel'),tone:'danger'});
    if(!yes)return;
    generation++;controller?.abort();doc=core.newDocument(ctx,t('untitled'));selectedId=null;
    undo=[];redo=[];failures=[];imageIO.releaseAll();status('emptyStatus');refreshCopy();showPreview();
  }
  function filesFromTransfer(data) {
    if(!data)return [];
    return Array.from(data.items||[]).filter(item=>item.kind==='file').map(item=>item.getAsFile()).filter(Boolean);
  }
  function editableTarget(target){return target?.closest?.('input,textarea,[contenteditable="true"],dialog[open]');}
  function paste(event) {
    if(editableTarget(event.target)||env.document.querySelector('dialog[open]'))return;
    const files=filesFromTransfer(event.clipboardData).filter(file=>!file.type||file.type.startsWith('image/'));
    if(!files.length)return;event.preventDefault();addImages(files);
  }
  function drop(event) {
    event.preventDefault();$('dropZone').classList.remove('drag-over');
    if(env.document.querySelector('dialog[open]'))return;
    const files=filesFromTransfer(event.dataTransfer);if(files.length)addImages(files);
  }
  function destroy(){generation++;controller?.abort();imageIO.releaseAll();image.hidden=true;image.removeAttribute('src');}
  $('addButton').addEventListener('click',()=>$('imageInput').click());
  $('retryButton').addEventListener('click',()=>$('imageInput').click());
  $('imageInput').addEventListener('change',event=>{const files=Array.from(event.target.files||[]);event.target.value='';addImages(files);});
  $('cancelButton').addEventListener('click',()=>{controller?.abort();status('cancelling');refreshCopy();});
  $('newButton').addEventListener('click',startNew);
  $('undoButton').addEventListener('click',()=>history('undo'));
  $('redoButton').addEventListener('click',()=>history('redo'));
  env.document.addEventListener('paste',paste);
  env.document.addEventListener('dragover',event=>{if(Array.from(event.dataTransfer?.types||[]).includes('Files'))event.preventDefault();});
  $('dropZone').addEventListener('dragover',event=>{event.preventDefault();if(!busy)$('dropZone').classList.add('drag-over');});
  $('dropZone').addEventListener('dragleave',()=>$('dropZone').classList.remove('drag-over'));
  env.document.addEventListener('drop',drop);
  env.addEventListener('pagehide',()=>{controller?.abort();imageIO.releaseAll();viewKey='';image.hidden=true;});
  env.addEventListener('pageshow',()=>{if(doc.pages.length)showPreview(true);});
  env.addEventListener('beforeunload',event=>{if(doc.pages.length){event.preventDefault();event.returnValue='';}});
  function localize(){refreshCopy();const page=doc.pages.find(p=>p.id===selectedId);if(page)image.alt=t('imageAlt',{name:page.title});}
  refreshCopy();showPreview();
  return Object.freeze({localize,destroy});
}
