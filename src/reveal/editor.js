/** The foundation editor owns transient document and asynchronous input state.
 * No draft/session storage is used in v0.1.0. Files never leave this page.
 */
function createEditor({core,imageIO,env,translate,getLanguage}) {
  const $ = id => env.document.getElementById(id);
  const ctx={newId:kind=>kind+'_'+Array.from(env.crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('')};
  let doc=core.newDocument(ctx,translate('untitled'));
  let selectedId=null, selectedMaskId=null, generation=0, batchId=0, displayGeneration=0;
  let controller=null, busy=false, failures=[], progress=null;
  let undo=[],redo=[],viewKey='',lastStatus='emptyStatus',mode='create',tool='move',studySession=null;
  let gesture=null,twoPointStart=null,draftRect=null;
  const image=$('previewImage'),svg=$('maskSvg');
  const t=translate;
  const studyView=createStudyView({core,dom:env.document,onAction:action=>handleViewAction(action)});
  function currentPage(){return doc.pages.find(p=>p.id===selectedId)||null;}
  function currentAsset(){const page=currentPage();return page&&doc.assets.find(a=>a.id===page.imageId)||null;}
  function currentMask(){return doc.masks.find(m=>m.id===selectedMaskId)||null;}
  function renderOverlay(){const page=currentPage(),asset=currentAsset();if(!page||!asset||image.hidden){svg.hidden=true;return;}studyView.mount({document:doc,pageId:page.id,session:studySession,mode:mode==='study'?'study':'edit',selectedMaskId});svg.hidden=false;}
  function updateToolButtons(){$('coverButton').setAttribute('aria-pressed',String(tool==='cover'));$('twoPointButton').setAttribute('aria-pressed',String(tool==='two-point'));$('moveImageButton').setAttribute('aria-pressed',String(tool==='move'));$('maskControls').hidden=!(currentMask()&&mode==='create');}
  function refreshStudy(){
    $('studyButton').disabled=busy||doc.questions.length===0;$('studyPanel').hidden=mode!=='study';$('editControls').hidden=mode==='study';
    $('createButton').setAttribute('aria-current',mode==='create'?'page':'false');$('studyButton').setAttribute('aria-current',mode==='study'?'page':'false');
    if(mode!=='study')return;if(!studySession)studySession=core.startSession(doc,{mode:'free'},ctx);
    const summary=core.summaryFree(studySession);$('confirmedCount').textContent=String(summary.confirmed);$('studyQuestionCount').textContent=String(summary.total);$('questionList').replaceChildren();
    const open=new Set(studySession.openQuestionIds);studySession.queue.forEach((qid,index)=>{if(!doc.questions.some(item=>item.id===qid))return;const button=env.document.createElement('button');button.type='button';button.className='question-item';button.dataset.questionId=qid;button.textContent=t(open.has(qid)?'hideQuestion':'revealQuestion',{number:index+1});button.addEventListener('click',()=>handleViewAction({type:'TOGGLE_QUESTION',questionId:qid}));$('questionList').append(button);});
  }
  function status(key, params={}) {
    lastStatus=key; progress=Object.keys(params).length?params:null;
    $('inputStatus').textContent=t(key,params);
  }
  function refreshCopy() {
    env.document.body.classList.toggle('has-pages',doc.pages.length>0);env.document.body.classList.toggle('study-mode',mode==='study');
    $('developmentNote').textContent=t(doc.pages.length?'loadedDevelopmentNote':'developmentNote');
    $('sheetTitle').textContent=doc.title;
    $('sheetCount').textContent=t('pageCount',{count:doc.pages.length});
    $('inputStatus').textContent=t(lastStatus,progress||{});
    $('newButton').disabled=!doc.pages.length&&!busy;
    $('addButton').disabled=busy||doc.pages.length>=core.limits.maxPages;
    $('imageInput').disabled=busy;
    $('cancelButton').hidden=!busy;
    $('undoButton').disabled=busy||mode==='study'||undo.length===0;
    $('redoButton').disabled=busy||mode==='study'||redo.length===0;
    $('emptyPreview').hidden=doc.pages.length!==0;
    $('imageMeta').hidden=!selectedId;
    $('loadedSection').hidden=doc.pages.length===0;
    $('coverButton').disabled=busy||!selectedId||mode==='study';$('twoPointButton').disabled=busy||!selectedId||mode==='study';$('moveImageButton').disabled=busy||!selectedId||mode==='study';
    $('pageList').replaceChildren();
    for(const p of doc.pages){
      const a=doc.assets.find(x=>x.id===p.imageId);
      const button=env.document.createElement('button');button.type='button';button.className='page-item';button.disabled=busy;
      button.setAttribute('aria-pressed',String(p.id===selectedId));
      const name=env.document.createElement('span');name.className='page-name';name.textContent=p.title;
      const details=env.document.createElement('span');details.className='page-details';details.textContent=`${a.width} × ${a.height} · ${formatBytes(a.byteLength)}`;
      button.append(name,details);button.addEventListener('click',()=>{selectedId=p.id;selectedMaskId=null;twoPointStart=null;refreshCopy();showPreview();});$('pageList').append(button);
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
    refreshStudy();updateToolButtons();renderOverlay();
  }
  function formatBytes(bytes){return bytes<1024?`${bytes} B`:bytes<1024**2?`${(bytes/1024).toFixed(1)} KiB`:`${(bytes/1024**2).toFixed(1)} MiB`;}
  async function showPreview(force=false) {
    const page=doc.pages.find(p=>p.id===selectedId),asset=page&&doc.assets.find(a=>a.id===page.imageId);
    if(!asset){viewKey='';displayGeneration++;image.hidden=true;svg.hidden=true;image.removeAttribute('src');$('previewWait').hidden=true;return;}
    if(!force&&viewKey===asset.id){renderOverlay();return;}
    viewKey=asset.id;const token=++displayGeneration,sourceGeneration=generation;
    image.hidden=true;svg.hidden=true;$('previewWait').hidden=false;$('previewWait').textContent=t('preparing');
    try {
      image.src=imageIO.urlFor(asset);
      await image.decode();
      if(token!==displayGeneration||sourceGeneration!==generation)return;
      image.alt=t('imageAlt',{name:page.title});image.hidden=false;$('previewWait').hidden=true;renderOverlay();
    }catch{
      if(token!==displayGeneration||sourceGeneration!==generation)return;
      image.hidden=true;svg.hidden=true;image.removeAttribute('src');viewKey='';$('previewWait').textContent=t('error_DECODE_FAILED');
    }
  }
  function commit(next,maskId=selectedMaskId) {
    undo.push(doc);if(undo.length>core.limits.maxUndo)undo.shift();redo=[];doc=next;selectedMaskId=maskId;studySession=null;
  }
  function history(direction) {
    if(busy||mode==='study')return;
    const from=direction==='undo'?undo:redo,to=direction==='undo'?redo:undo;
    if(!from.length)return;
    to.push(doc);doc={...from.pop(),revision:doc.revision+1};
    if(!doc.pages.some(p=>p.id===selectedId))selectedId=doc.pages.at(-1)?.id||null;
    if(!doc.masks.some(m=>m.id===selectedMaskId))selectedMaskId=null;studySession=null;
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
    generation++;controller?.abort();doc=core.newDocument(ctx,t('untitled'));selectedId=null;selectedMaskId=null;
    undo=[];redo=[];failures=[];studySession=null;mode='create';tool='move';twoPointStart=null;imageIO.releaseAll();status('emptyStatus');refreshCopy();showPreview();
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
  function setTool(next){if(mode!=='create'||!selectedId)return;tool=next;twoPointStart=null;clearDraft();updateToolButtons();svg.focus();}
  function imagePoint(event){const asset=currentAsset(),matrix=svg.getScreenCTM();if(!asset||!matrix)return null;const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;const out=p.matrixTransform(matrix.inverse());if(out.x<0||out.y<0||out.x>asset.width||out.y>asset.height)return null;return{x:out.x,y:out.y};}
  function rectFromPoints(a,b){const asset=currentAsset();if(!asset)return null;const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(a.x-b.x),h=Math.abs(a.y-b.y);if(w<1||h<1)return null;return{x:x/asset.width,y:y/asset.height,w:w/asset.width,h:h/asset.height};}
  function clearDraft(){draftRect?.remove();draftRect=null;gesture=null;}
  function drawDraft(a,b){const rect=rectFromPoints(a,b);if(!rect)return;const asset=currentAsset(),px=core.rectToPixels(rect,asset.width,asset.height);if(!draftRect){draftRect=env.document.createElementNS('http://www.w3.org/2000/svg','rect');draftRect.classList.add('mask-draft');svg.append(draftRect);}draftRect.setAttribute('x',String(px.x));draftRect.setAttribute('y',String(px.y));draftRect.setAttribute('width',String(px.w));draftRect.setAttribute('height',String(px.h));}
  function addCover(rect){const before=new Set(doc.masks.map(m=>m.id)),result=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId:selectedId,rect},ctx),added=result.document.masks.find(m=>!before.has(m.id));commit(result.document,added?.id||null);status('coverAdded');tool='move';twoPointStart=null;clearDraft();refreshCopy();}
  function pointerDown(event){if(mode!=='create'||tool!=='cover'||event.button!==0)return;const point=imagePoint(event);if(!point)return;event.preventDefault();gesture={pointerId:event.pointerId,start:point,current:point};svg.setPointerCapture(event.pointerId);}
  function pointerMove(event){if(!gesture||event.pointerId!==gesture.pointerId)return;const point=imagePoint(event);if(point){gesture.current=point;drawDraft(gesture.start,point);}}
  function pointerUp(event){if(!gesture||event.pointerId!==gesture.pointerId)return;const start=gesture.start,point=imagePoint(event)||gesture.current;svg.releasePointerCapture(event.pointerId);clearDraft();const rect=rectFromPoints(start,point);if(rect)addCover(rect);else{tool='move';updateToolButtons();}}
  function pointerCancel(){if(!gesture)return;clearDraft();tool='move';updateToolButtons();}
  function twoPoint(event){if(mode!=='create'||tool!=='two-point'||event.target!==svg)return;const point=imagePoint(event);if(!point)return;if(!twoPointStart){twoPointStart=point;status('chooseSecondPoint');return;}const rect=rectFromPoints(twoPointStart,point);twoPointStart=null;if(rect)addCover(rect);else status('coverTooSmall');}
  function handleViewAction(action){if(action.type==='SELECT_MASK'){selectedMaskId=action.maskId;refreshCopy();return;}if(action.type==='TOGGLE_QUESTION'&&mode==='study'){studySession=core.toggleFree(studySession,action.questionId);refreshCopy();}}
  function editSelected(kind,amount=1){const mask=currentMask(),asset=currentAsset();if(!mask||!asset||mode!=='create')return;const dx=amount/asset.width,dy=amount/asset.height;let r={...mask.rect};if(kind==='left')r.x-=dx;if(kind==='right')r.x+=dx;if(kind==='up')r.y-=dy;if(kind==='down')r.y+=dy;if(kind==='wider')r.w+=dx;if(kind==='narrower')r.w-=dx;if(kind==='taller')r.h+=dy;if(kind==='shorter')r.h-=dy;try{const next=core.applyCommand(doc,{type:'SET_MASK_RECT',maskId:mask.id,rect:r},ctx).document;commit(next,mask.id);status('coverChanged');refreshCopy();}catch(error){if(error.code!=='INVALID_SHEET')throw error;}}
  function deleteSelected(){const mask=currentMask();if(!mask)return;const next=core.applyCommand(doc,{type:'DELETE_MASK',maskId:mask.id},ctx).document;commit(next,null);status('coverDeleted');refreshCopy();}
  function duplicateSelected(){const mask=currentMask();if(!mask)return;const before=new Set(doc.masks.map(m=>m.id)),next=core.applyCommand(doc,{type:'DUPLICATE_MASK',maskId:mask.id},ctx).document,added=next.masks.find(m=>!before.has(m.id));commit(next,added?.id||null);status('coverAdded');refreshCopy();}
  function beginStudy(){if(!doc.questions.length||busy)return;mode='study';tool='move';selectedMaskId=null;studySession=core.startSession(doc,{mode:'free'},ctx);refreshCopy();}
  function beginCreate(){mode='create';studySession=null;refreshCopy();$('addButton').focus({preventScroll:true});}
  function keydown(event){if(editableTarget(event.target)||env.document.querySelector('dialog[open]')||mode!=='create'||!currentMask())return;const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};if(map[event.key]){event.preventDefault();editSelected(map[event.key],event.shiftKey?10:1);}else if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();deleteSelected();}else if(event.key==='Escape'){selectedMaskId=null;tool='move';twoPointStart=null;pointerCancel();refreshCopy();}}
  function destroy(){generation++;controller?.abort();imageIO.releaseAll();studyView.destroy();image.hidden=true;svg.hidden=true;image.removeAttribute('src');}
  $('addButton').addEventListener('click',()=>$('imageInput').click());
  $('retryButton').addEventListener('click',()=>$('imageInput').click());
  $('imageInput').addEventListener('change',event=>{const files=Array.from(event.target.files||[]);event.target.value='';addImages(files);});
  $('cancelButton').addEventListener('click',()=>{controller?.abort();status('cancelling');refreshCopy();});
  $('newButton').addEventListener('click',startNew);
  $('undoButton').addEventListener('click',()=>history('undo'));
  $('redoButton').addEventListener('click',()=>history('redo'));
  $('coverButton').addEventListener('click',()=>setTool('cover'));$('twoPointButton').addEventListener('click',()=>setTool('two-point'));$('moveImageButton').addEventListener('click',()=>setTool('move'));
  $('maskMoveLeft').addEventListener('click',()=>editSelected('left'));$('maskMoveRight').addEventListener('click',()=>editSelected('right'));$('maskMoveUp').addEventListener('click',()=>editSelected('up'));$('maskMoveDown').addEventListener('click',()=>editSelected('down'));
  $('maskWider').addEventListener('click',()=>editSelected('wider'));$('maskNarrower').addEventListener('click',()=>editSelected('narrower'));$('maskTaller').addEventListener('click',()=>editSelected('taller'));$('maskShorter').addEventListener('click',()=>editSelected('shorter'));$('maskDelete').addEventListener('click',deleteSelected);$('maskDuplicate').addEventListener('click',duplicateSelected);
  $('studyButton').addEventListener('click',beginStudy);$('createButton').addEventListener('click',beginCreate);$('hideAllButton').addEventListener('click',()=>{studySession=core.hideAllFree(studySession);refreshCopy();});$('revealPageButton').addEventListener('click',()=>{studySession=core.revealPageFree(doc,studySession,selectedId);refreshCopy();});
  svg.addEventListener('pointerdown',pointerDown);svg.addEventListener('pointermove',pointerMove);svg.addEventListener('pointerup',pointerUp);svg.addEventListener('pointercancel',pointerCancel);svg.addEventListener('click',twoPoint);
  env.document.addEventListener('keydown',keydown);
  env.document.addEventListener('paste',paste);
  env.document.addEventListener('dragover',event=>{if(Array.from(event.dataTransfer?.types||[]).includes('Files'))event.preventDefault();});
  $('dropZone').addEventListener('dragover',event=>{event.preventDefault();if(!busy)$('dropZone').classList.add('drag-over');});
  $('dropZone').addEventListener('dragleave',()=>$('dropZone').classList.remove('drag-over'));
  env.document.addEventListener('drop',drop);
  env.addEventListener('pagehide',()=>{controller?.abort();imageIO.releaseAll();viewKey='';image.hidden=true;svg.hidden=true;});
  env.addEventListener('pageshow',()=>{if(doc.pages.length)showPreview(true);});
  env.addEventListener('beforeunload',event=>{if(doc.pages.length){event.preventDefault();event.returnValue='';}});
  function localize(){refreshCopy();const page=doc.pages.find(p=>p.id===selectedId);if(page)image.alt=t('imageAlt',{name:page.title});}
  refreshCopy();showPreview();
  return Object.freeze({localize,destroy});
}
