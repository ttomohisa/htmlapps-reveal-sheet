/** The foundation editor owns transient document and asynchronous input state.
 * No draft/session storage is used in v0.1.0. Files never leave this page.
 */
function createEditor({core,imageIO,projectIO,persistence,playerTemplate,appVersion,env,translate,getLanguage}) {
  const $ = id => env.document.getElementById(id);
  const ctx={newId:kind=>kind+'_'+Array.from(env.crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('')};
  let doc=core.newDocument(ctx,translate('untitled'));
  let selectedId=null, selectedMaskId=null, selectedMaskIds=new Set(), generation=0, batchId=0, displayGeneration=0;
  let controller=null, busy=false, failures=[], progress=null;
  let undo=[],redo=[],viewKey='',lastStatus='emptyStatus',mode='create',tool='move',studySession=null,studyMode='free',previousStudySummary=null,studyEditActive=false,studyEditImpact=null;
  let filenameBase='reveal-sheet',preparedLessonExport=null,exportGeneration=0,exportBusy=false,lessonPreviewSession=null,lessonPreviewPageId=null,lessonPreviewGeneration=0;
  let gesture=null,twoPointStart=null,draftRect=null;
  let draftSaveTimer=0,draftSaveChain=Promise.resolve(),localDraftGeneration=0,draftConflict=false,localAvailable=false,localDraftExists=false,lastDraftSavedAt='';
  let studySaveTimer=0,studySaveChain=Promise.resolve(),studyRecordGeneration=0,studyIdentityToken='',studyConflict=false,localStudyExists=false,lastStudySavedAt='';
  const image=$('previewImage'),svg=$('maskSvg');
  // SVGElement does not reliably reflect the HTML hidden IDL property.
  // Toggle the attribute explicitly because shared CSS hides [hidden].
  function setSvgHidden(hidden){if(hidden)svg.setAttribute('hidden','');else svg.removeAttribute('hidden');}
  const t=translate;
  const studyView=createStudyView({core,dom:env.document,onAction:action=>handleViewAction(action)});
  function setDraftStatus(key,values={}){const node=$('draftSaveStatus');if(node)node.textContent=t(key,values);}
  function setStudyStatus(key,values={}){const node=$('studySaveStatus');if(node)node.textContent=t(key,values);}
  function identityToken(identity){return identity?identity.documentId+'|'+identity.revision+'|'+identity.fingerprint:'';}
  async function currentStudyIdentity(documentSnapshot=doc){
    const fingerprint=await persistence.fingerprintDocument(documentSnapshot);if(!fingerprint)return null;
    return {documentId:documentSnapshot.id,revision:documentSnapshot.revision,fingerprint};
  }
  function refreshLocalStudy(){
    const toggle=$('studyOptIn');if(!toggle)return;toggle.checked=Boolean(persistence.settings.studyOptIn);toggle.disabled=!localAvailable;
    $('clearDraftButton').disabled=!localAvailable||!localDraftExists;
    $('clearStudyButton').disabled=!localAvailable||!localStudyExists;
  }
  function cancelStudyTimer(){if(studySaveTimer){env.clearTimeout(studySaveTimer);studySaveTimer=0;}}
  function scheduleStudySave(){
    cancelStudyTimer();if(!localAvailable||!persistence.settings.studyOptIn||studyConflict||!studySession||!doc.questions.length)return;
    const sessionSnapshot=studySession,documentSnapshot=doc;setStudyStatus('studySaveWaiting');
    studySaveTimer=env.setTimeout(()=>{studySaveTimer=0;studySaveChain=studySaveChain.then(async()=>{
      if(!localAvailable||!persistence.settings.studyOptIn||studyConflict)return;
      const identity=await currentStudyIdentity(documentSnapshot);if(!identity){setStudyStatus('studyPersistenceUnavailable');return;}
      const token=identityToken(identity);if(token!==studyIdentityToken){studyIdentityToken=token;studyRecordGeneration=0;}
      setStudyStatus('studySaving');
      try{const receipt=await persistence.saveSession(identity,sessionSnapshot,studyRecordGeneration);if(receipt){studyRecordGeneration=receipt.generation;localStudyExists=true;refreshLocalStudy();lastStudySavedAt=receipt.savedAt;setStudyStatus('studySaved',{time:new Date(receipt.savedAt).toLocaleTimeString(getLanguage()==='ja'?'ja-JP':'en-US',{hour:'2-digit',minute:'2-digit'})});}}
      catch(error){if(error?.code==='SAVE_CONFLICT'){studyConflict=true;setStudyStatus('studyConflictStatus');}else setStudyStatus('studySaveFailed');}
      if(!studyConflict&&persistence.settings.studyOptIn&&studySession&&studySession!==sessionSnapshot)scheduleStudySave();
    });},500);
  }
  async function changeStudyOptIn(event){
    const wanted=event.currentTarget.checked;
    if(wanted){
      event.currentTarget.checked=false;const fingerprint=await persistence.fingerprintDocument(doc);if(!fingerprint){setStudyStatus('studyPersistenceUnavailable');refreshLocalStudy();return;}
      const identity={documentId:doc.id,revision:doc.revision,fingerprint};
      const yes=await env.AppConfirm.ask({title:t('studyOptInTitle'),message:t('studyOptInMessage'),confirmLabel:t('studyOptInAction'),cancelLabel:t('cancel')});if(!yes){refreshLocalStudy();return;}
      try{const existing=await persistence.loadSession(identity);if(existing)localStudyExists=true;await persistence.setStudyOptIn(true);studyConflict=false;studyRecordGeneration=existing?.generation||0;studyIdentityToken=identityToken(identity);setStudyStatus('studyEnabled');refreshLocalStudy();scheduleStudySave();}catch{setStudyStatus('studySaveFailed');refreshLocalStudy();}
    }else{
      cancelStudyTimer();try{await persistence.setStudyOptIn(false);studyConflict=false;studyRecordGeneration=0;studyIdentityToken='';setStudyStatus('studyDisabled');}catch{setStudyStatus('studySaveFailed');}refreshLocalStudy();
    }
  }
  async function clearStudyLocal(){
    const yes=await env.AppConfirm.ask({title:t('clearStudyTitle'),message:t('clearStudyMessage'),confirmLabel:t('clearStudyAction'),cancelLabel:t('cancel'),tone:'danger'});if(!yes)return;
    cancelStudyTimer();try{await persistence.clearLocal('study');studyConflict=false;studyRecordGeneration=0;studyIdentityToken='';localStudyExists=false;setStudyStatus('studyCleared');refreshLocalStudy();}catch{setStudyStatus('studySaveFailed');}
  }
  async function clearDraftLocal(){
    const yes=await env.AppConfirm.ask({title:t('clearDraftTitle'),message:t('clearDraftMessage'),confirmLabel:t('clearDraftAction'),cancelLabel:t('cancel'),tone:'danger'});if(!yes)return;
    cancelDraftTimer();try{await persistence.clearLocal('draft');localDraftGeneration=0;draftConflict=false;localDraftExists=false;lastDraftSavedAt='';setDraftStatus('draftCleared');refreshLocalDraft();refreshLocalStudy();}catch{setDraftStatus('draftSaveFailed');}
  }
  function refreshLocalDraft(){
    const toggle=$('draftOptIn');if(!toggle)return;toggle.checked=Boolean(persistence.settings.draftOptIn);toggle.disabled=!localAvailable;
    $('draftConflict').hidden=!draftConflict;$('resolveConflictSaveButton').hidden=!draftConflict;$('resolveConflictReloadButton').hidden=!draftConflict;refreshLocalStudy();
  }
  function cancelDraftTimer(){if(draftSaveTimer){env.clearTimeout(draftSaveTimer);draftSaveTimer=0;}}
  function scheduleDraftSave(){
    cancelDraftTimer();if(!localAvailable||!persistence.settings.draftOptIn||draftConflict||!doc.pages.length)return;
    setDraftStatus('draftSaveWaiting');const scheduledGeneration=generation;
    draftSaveTimer=env.setTimeout(()=>{draftSaveTimer=0;const snapshot=doc;draftSaveChain=draftSaveChain.then(async()=>{
      if(!localAvailable||!persistence.settings.draftOptIn||draftConflict||!snapshot.pages.length)return;if(scheduledGeneration!==generation&&snapshot.id!==doc.id){scheduleDraftSave();return;}
      setDraftStatus('draftSaving');try{const receipt=await persistence.saveSnapshot(snapshot,localDraftGeneration);if(receipt){localDraftGeneration=receipt.generation;localDraftExists=true;refreshLocalStudy();lastDraftSavedAt=receipt.savedAt;setDraftStatus('draftSaved',{time:new Date(receipt.savedAt).toLocaleTimeString(getLanguage()==='ja'?'ja-JP':'en-US',{hour:'2-digit',minute:'2-digit'})});}}
      catch(error){if(error?.code==='SAVE_CONFLICT'){draftConflict=true;setDraftStatus('draftConflictStatus');refreshLocalDraft();}else setDraftStatus('draftSaveFailed');}
      if(!draftConflict&&persistence.settings.draftOptIn&&(doc.id!==snapshot.id||doc.revision!==snapshot.revision))scheduleDraftSave();
    });},1000);
  }
  async function changeDraftOptIn(event){
    const wanted=event.currentTarget.checked;if(wanted){event.currentTarget.checked=false;const yes=await env.AppConfirm.ask({title:t('draftOptInTitle'),message:t('draftOptInMessage'),confirmLabel:t('draftOptInAction'),cancelLabel:t('cancel')});if(!yes){refreshLocalDraft();return;}
      try{await persistence.setDraftOptIn(true);draftConflict=false;setDraftStatus(doc.pages.length?'draftSaveWaiting':'draftEnabled');refreshLocalDraft();scheduleDraftSave();}catch{setDraftStatus('draftUnavailable');refreshLocalDraft();}
    }else{cancelDraftTimer();try{await persistence.setDraftOptIn(false);setDraftStatus('draftDisabled');}catch{setDraftStatus('draftUnavailable');}refreshLocalDraft();}
  }
  async function reloadConflictDraft(){
    const yes=await env.AppConfirm.ask({title:t('reloadLocalTitle'),message:t('reloadLocalMessage'),confirmLabel:t('reloadLocalAction'),cancelLabel:t('cancel'),tone:'danger'});if(!yes)return;
    try{const saved=await persistence.loadSnapshot();if(!saved)return;localDraftGeneration=saved.generation;localDraftExists=true;draftConflict=false;applyImported({document:saved.document},{fromLocal:true});lastDraftSavedAt=saved.savedAt;setDraftStatus('draftRestored');refreshLocalDraft();}catch{setDraftStatus('draftSaveFailed');}
  }
  async function initPersistence(){
    const capability=await persistence.probe();localAvailable=capability.available;refreshLocalDraft();if(!localAvailable){setDraftStatus('draftUnavailable');setStudyStatus('studyPersistenceUnavailable');return;}
    try{const localState=await persistence.getLocalState();localDraftExists=Boolean(localState.draftExists);localStudyExists=Boolean(localState.studyExists);}catch{localDraftExists=false;localStudyExists=false;}refreshLocalDraft();setStudyStatus(persistence.settings.studyOptIn?'studyEnabled':'studyDisabled');
    let saved=null;try{saved=await persistence.loadSnapshot();}catch{setDraftStatus('draftSaveFailed');return;}if(!saved){setDraftStatus(persistence.settings.draftOptIn?'draftEnabled':'draftDisabled');return;}
    localDraftGeneration=saved.generation;lastDraftSavedAt=saved.savedAt;const yes=await env.AppConfirm.ask({title:t('resumeLocalTitle'),message:t('resumeLocalMessage'),confirmLabel:t('resumeLocalAction'),cancelLabel:t('startFreshAction')});
    if(yes){applyImported({document:saved.document},{fromLocal:true});setDraftStatus('draftRestored');}else setDraftStatus(persistence.settings.draftOptIn?'draftEnabled':'draftDisabled');refreshLocalDraft();
  }
  function currentPage(){return doc.pages.find(p=>p.id===selectedId)||null;}
  function currentAsset(){const page=currentPage();return page&&doc.assets.find(a=>a.id===page.imageId)||null;}
  function currentMask(){return doc.masks.find(m=>m.id===selectedMaskId)||null;}
  function refreshCoverPanel(){
    const page=currentPage(),panel=$('coverPanel'),list=$('coverList');
    if(!page){panel.hidden=true;list.replaceChildren();selectedMaskIds.clear();return;}
    const pageMasks=doc.masks.filter(mask=>mask.pageId===page.id);
    selectedMaskIds=new Set([...selectedMaskIds].filter(id=>pageMasks.some(mask=>mask.id===id)));
    panel.hidden=mode!=='create';
    $('questionCountEdit').textContent=String(doc.questions.filter(question=>question.pageId===page.id).length);
    list.replaceChildren();
    pageMasks.forEach((mask,index)=>{
      const button=env.document.createElement('button');button.type='button';button.className='cover-list-item';button.dataset.maskId=mask.id;
      button.setAttribute('aria-pressed',String(selectedMaskIds.has(mask.id)));
      button.textContent=t(mask.kind==='auxiliary'?'coverAuxItem':'coverAnswerItem',{number:index+1});
      button.addEventListener('click',()=>{if(selectedMaskIds.has(mask.id))selectedMaskIds.delete(mask.id);else selectedMaskIds.add(mask.id);selectedMaskId=mask.id;refreshCopy();});
      list.append(button);
    });
    const chosen=pageMasks.filter(mask=>selectedMaskIds.has(mask.id));
    const answerQuestions=[...new Set(chosen.filter(mask=>mask.kind==='answer').map(mask=>mask.questionId))];
    $('groupButton').disabled=busy||chosen.some(mask=>mask.kind!=='answer')||answerQuestions.length<2;
    const groupedQuestion=chosen.length===1&&chosen[0].kind==='answer'?doc.questions.find(question=>question.id===chosen[0].questionId&&question.maskIds.length>1):null;
    $('ungroupButton').disabled=busy||!groupedQuestion;
    $('makeAuxiliaryButton').disabled=busy||chosen.length!==1||chosen[0].kind!=='answer';
    $('makeAnswerButton').disabled=busy||chosen.length!==1||chosen[0].kind!=='auxiliary';
    $('duplicateSelectionButton').disabled=busy||chosen.length===0;
    const warnings=core.overlapWarnings(doc,page.id);$('overlapWarning').hidden=warnings.length===0;$('overlapWarning').textContent=warnings.length?t('overlapWarning',{count:warnings.length}):'';
  }
  function renderOverlay(){const page=currentPage(),asset=currentAsset();if(!page||!asset||image.hidden){setSvgHidden(true);return;}studyView.mount({document:doc,pageId:page.id,session:studySession,mode:mode==='study'?'study':'edit',selectedMaskId,selectedMaskIds:[...selectedMaskIds]});setSvgHidden(false);refreshViewControls();}
  function sameView(a,b){return a&&b&&a.zoom===b.zoom&&a.centerX===b.centerX&&a.centerY===b.centerY;}
  function refreshViewControls(){
    const page=currentPage();$('viewControls').hidden=!page||mode==='save';$('returnToStudyButton').hidden=!studyEditActive;
    if(!page){$('focusQuestionButton').hidden=true;return;}
    const view=studyView.getViewState(page.id);$('viewZoomValue').textContent=Math.round(view.zoom*100)+'%';
    const qid=mode==='study'&&studySession?.mode==='guided'?currentGuidedId():null;
    if(!qid){$('focusQuestionButton').hidden=true;return;}
    const focused=core.revealTarget(doc,qid,view);$('focusQuestionButton').hidden=sameView(view,focused);
  }
  function setCurrentView(next){const page=currentPage();if(!page)return;studyView.setViewState(page.id,next);refreshViewControls();}
  function nudgeView(dx,dy){const page=currentPage();if(!page)return;const view=studyView.getViewState(page.id),step=.12/view.zoom;setCurrentView({...view,centerX:view.centerX+dx*step,centerY:view.centerY+dy*step});}
  function zoomView(factor){const page=currentPage();if(!page)return;const view=studyView.getViewState(page.id);setCurrentView({...view,zoom:view.zoom*factor});}
  function fitView(){const page=currentPage();if(page)setCurrentView({zoom:1,centerX:.5,centerY:.5});}
  function focusCurrentQuestion(){const qid=currentGuidedId(),page=currentPage();if(!qid||!page)return;setCurrentView(core.revealTarget(doc,qid,studyView.getViewState(page.id)));}
  function updateToolButtons(){$('coverButton').setAttribute('aria-pressed',String(tool==='cover'));$('twoPointButton').setAttribute('aria-pressed',String(tool==='two-point'));$('moveImageButton').setAttribute('aria-pressed',String(tool==='move'));$('maskControls').hidden=!(currentMask()&&mode==='create');}
  function studyHasProgress(session){
    if(!session)return false;if(session.mode==='free')return session.confirmedQuestionIds.length>0||session.openQuestionIds.length>0;
    return session.stage==='revealed'||session.index>0||Object.values(session.ratings).some(value=>value!=='unanswered')||session.ended;
  }
  function currentGuidedId(session=studySession){return session?.mode==='guided'&&!session.ended?session.queue[session.index]?.questionId||null:null;}
  function syncGuidedPage(){
    const qid=currentGuidedId();if(!qid)return false;const question=doc.questions.find(item=>item.id===qid);if(!question||question.pageId===selectedId)return false;
    selectedId=question.pageId;selectedMaskId=null;selectedMaskIds.clear();twoPointStart=null;viewKey='';return true;
  }
  function fillGuidedResults(summary){
    $('resultTotal').textContent=String(summary.total);$('resultRecalled').textContent=String(summary.recalled);$('resultAgain').textContent=String(summary.again);$('resultSkipped').textContent=String(summary.skipped);$('resultUnanswered').textContent=String(summary.unanswered);
    $('reviewAgainButton').hidden=summary.again===0;$('reviewUncheckedButton').hidden=summary.skipped+summary.unanswered===0;
  }
  function refreshStudy(){
    $('studyButton').disabled=busy||doc.questions.length===0;$('saveButton').disabled=busy||doc.pages.length===0;$('openButton').disabled=busy;$('sheetInput').disabled=busy;$('studyPanel').hidden=mode!=='study';$('savePanel').hidden=mode!=='save';$('editControls').hidden=mode!=='create';
    $('createButton').setAttribute('aria-current',mode==='create'?'page':'false');$('studyButton').setAttribute('aria-current',mode==='study'?'page':'false');$('saveButton').setAttribute('aria-current',mode==='save'?'page':'false');
    if(mode!=='study')return;if(!studySession)studySession=core.startSession(doc,{mode:studyMode},ctx);studyMode=studySession.mode;
    $('freeModeButton').setAttribute('aria-pressed',String(studyMode==='free'));$('guidedModeButton').setAttribute('aria-pressed',String(studyMode==='guided'));$('freeStudyPanel').hidden=studyMode!=='free';$('guidedPanel').hidden=studyMode!=='guided';
    if(studyMode==='free'){
      const summary=core.summaryFree(studySession);$('confirmedCount').textContent=String(summary.confirmed);$('studyQuestionCount').textContent=String(summary.total);$('questionList').replaceChildren();
      const open=new Set(studySession.openQuestionIds);studySession.queue.forEach((qid,index)=>{if(!doc.questions.some(item=>item.id===qid))return;const button=env.document.createElement('button');button.type='button';button.className='question-item';button.dataset.questionId=qid;button.textContent=t(open.has(qid)?'hideQuestion':'revealQuestion',{number:index+1});button.addEventListener('click',()=>handleViewAction({type:'TOGGLE_QUESTION',questionId:qid}));$('questionList').append(button);});
      return;
    }
    $('otherAnswersHidden').checked=studySession.otherAnswers==='hidden';$('otherAnswersVisible').checked=studySession.otherAnswers==='visible';
    const total=studySession.queue.length,current=Math.min(studySession.index+1,total);$('guidedProgress').textContent=t('questionProgress',{current:studySession.ended?total:current,total});
    const qid=currentGuidedId(),question=qid&&doc.questions.find(item=>item.id===qid);const revealed=Boolean(question&&studySession.stage==='revealed');
    $('guidedPrompt').hidden=!question?.prompt;$('guidedPrompt').textContent=question?.prompt||'';$('guidedAnswerBox').hidden=!revealed;$('guidedAnswer').textContent=revealed?(question?.answer||''):'';
    $('revealCurrentButton').disabled=!question||studySession.stage!=='hidden';$('editCurrentQuestionButton').disabled=!question;$('recalledButton').disabled=!revealed;$('againButton').disabled=!revealed;$('skipButton').disabled=!question;$('previousQuestionButton').disabled=studySession.queue.length===0||(!studySession.ended&&studySession.index<=0);$('finishStudyButton').disabled=studySession.ended;
    const summary=core.summary(studySession);fillGuidedResults(summary);$('studyResults').hidden=!studySession.ended;
    $('previousResultSummary').hidden=!previousStudySummary;$('previousResultSummary').textContent=previousStudySummary?t('previousResultLabel')+`: ${previousStudySummary.recalled}/${previousStudySummary.total}`:'';
    $('guidedQuestionList').replaceChildren();studySession.queue.forEach((item,index)=>{const button=env.document.createElement('button');button.type='button';button.className='question-item';button.dataset.questionId=item.questionId;const rating=studySession.ratings[item.questionId]||'unanswered';button.dataset.rating=rating;button.textContent=`${t('guidedQuestion',{number:index+1})} · ${rating}`;button.setAttribute('aria-current',String(!studySession.ended&&index===studySession.index));button.addEventListener('click',()=>goGuidedQuestion(item.questionId));$('guidedQuestionList').append(button);});
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
    const activePage=currentPage(),activePageIndex=activePage?doc.pages.findIndex(page=>page.id===activePage.id):-1;
    $('pageControls').hidden=!activePage||mode!=='create';
    if(activePage&&env.document.activeElement!==$('pageTitleInput'))$('pageTitleInput').value=activePage.title;
    refreshCoverPanel();
    $('pagePrevButton').disabled=busy||activePageIndex<=0;$('pageNextButton').disabled=busy||activePageIndex<0||activePageIndex>=doc.pages.length-1;$('pageDeleteButton').disabled=busy||!activePage;
    $('coverButton').disabled=busy||!selectedId||mode==='study';$('twoPointButton').disabled=busy||!selectedId||mode==='study';$('moveImageButton').disabled=busy||!selectedId||mode==='study';
    $('pageList').replaceChildren();
    for(const p of doc.pages){
      const a=doc.assets.find(x=>x.id===p.imageId);
      const button=env.document.createElement('button');button.type='button';button.className='page-item';button.disabled=busy;
      button.setAttribute('aria-pressed',String(p.id===selectedId));
      const name=env.document.createElement('span');name.className='page-name';name.textContent=p.title;
      const details=env.document.createElement('span');details.className='page-details';details.textContent=`${a.width} × ${a.height} · ${formatBytes(a.byteLength)}`;
      button.append(name,details);button.addEventListener('click',()=>{selectedId=p.id;selectedMaskId=null;selectedMaskIds.clear();twoPointStart=null;refreshCopy();showPreview();});$('pageList').append(button);
    }
    $('failureSection').hidden=failures.length===0;
    $('failureList').replaceChildren();
    for(const failure of failures){
      const li=env.document.createElement('li'),name=env.document.createElement('strong'),reason=env.document.createElement('span');
      name.textContent=failure.name;reason.textContent=t('error_'+failure.code);li.append(name,reason);$('failureList').append(li);
    }
    const page=doc.pages.find(p=>p.id===selectedId),asset=page&&doc.assets.find(a=>a.id===page.imageId);
    if(asset){$('imageDimensions').textContent=`${asset.width} × ${asset.height} px`;$('imageBytes').textContent=formatBytes(asset.byteLength);}
    const totalAssetBytes=doc.assets.reduce((sum,a)=>sum+a.byteLength,0);
    $('totalBytes').textContent=formatBytes(totalAssetBytes);$('savePageCount').textContent=String(doc.pages.length);$('saveQuestionCount').textContent=String(doc.questions.length);$('saveAuxCount').textContent=String(doc.masks.filter(mask=>mask.kind==='auxiliary').length);$('saveImageBytes').textContent=formatBytes(totalAssetBytes);$('saveHtmlBytes').textContent=preparedLessonExport?formatBytes(preparedLessonExport.size):'—';$('downloadJsonButton').disabled=busy||exportBusy||doc.pages.length===0;$('downloadHtmlButton').disabled=busy||exportBusy||doc.questions.length===0||!playerTemplate;$('previewLessonButton').disabled=busy||exportBusy||doc.questions.length===0||!playerTemplate;
    if(!$('outputFilename').value)$('outputFilename').value=filenameBase;
    refreshStudy();updateToolButtons();renderOverlay();refreshViewControls();
  }
  function formatBytes(bytes){return bytes<1024?`${bytes} B`:bytes<1024**2?`${(bytes/1024).toFixed(1)} KiB`:`${(bytes/1024**2).toFixed(1)} MiB`;}
  function setLessonPreviewSvgHidden(hidden){const node=$('lessonPreviewSvg');if(hidden)node.setAttribute('hidden','');else node.removeAttribute('hidden');}
  function resetLessonPreview(){
    lessonPreviewGeneration++;lessonPreviewSession=null;lessonPreviewPageId=null;const img=$('lessonPreviewImage'),svg=$('lessonPreviewSvg');img.hidden=true;img.removeAttribute('src');setLessonPreviewSvgHidden(true);svg.replaceChildren();$('lessonPreviewQuestionList').replaceChildren();$('lessonPreviewPages').replaceChildren();$('lessonPreviewConfirmed').textContent='0';$('lessonPreviewTotal').textContent='0';
  }
  function renderLessonPreview(){
    if(!lessonPreviewSession||!lessonPreviewPageId)return;const page=doc.pages.find(item=>item.id===lessonPreviewPageId),asset=page&&doc.assets.find(item=>item.id===page.imageId);if(!page||!asset)return;
    const svg=$('lessonPreviewSvg');svg.setAttribute('viewBox',`0 0 ${asset.width} ${asset.height}`);svg.replaceChildren();const visible=core.visibilityFor(doc,lessonPreviewSession);
    for(const mask of doc.masks.filter(item=>item.pageId===page.id).sort((a,b)=>(a.kind==='auxiliary'?1:0)-(b.kind==='auxiliary'?1:0))){
      if(!visible.get(mask.id))continue;const px=core.rectToPixels(mask.rect,asset.width,asset.height),rect=env.document.createElementNS('http://www.w3.org/2000/svg','rect');rect.setAttribute('x',String(px.x));rect.setAttribute('y',String(px.y));rect.setAttribute('width',String(px.w));rect.setAttribute('height',String(px.h));rect.classList.add('mask-rect');if(mask.kind==='auxiliary')rect.classList.add('auxiliary');rect.setAttribute('aria-hidden','true');svg.append(rect);
    }
    const summary=core.summaryFree(lessonPreviewSession);$('lessonPreviewConfirmed').textContent=String(summary.confirmed);$('lessonPreviewTotal').textContent=String(summary.total);
    const pages=$('lessonPreviewPages');pages.replaceChildren();doc.pages.forEach((item,index)=>{const button=env.document.createElement('button');button.type='button';button.className='question-item';button.textContent=(index+1)+'. '+item.title;button.setAttribute('aria-pressed',String(item.id===page.id));button.addEventListener('click',()=>showLessonPreviewPage(item.id));pages.append(button);});
    const open=new Set(lessonPreviewSession.openQuestionIds),list=$('lessonPreviewQuestionList');list.replaceChildren();lessonPreviewSession.queue.forEach((qid,index)=>{const question=doc.questions.find(item=>item.id===qid);if(!question)return;const button=env.document.createElement('button');button.type='button';button.className='question-item';button.textContent=t(open.has(qid)?'hideQuestion':'revealQuestion',{number:index+1});button.addEventListener('click',async()=>{lessonPreviewSession=core.toggleFree(lessonPreviewSession,qid);if(question.pageId!==lessonPreviewPageId)await showLessonPreviewPage(question.pageId);else renderLessonPreview();});list.append(button);});
  }
  async function showLessonPreviewPage(nextPageId){
    if(!lessonPreviewSession)return;const page=doc.pages.find(item=>item.id===nextPageId);if(!page)return;const asset=doc.assets.find(item=>item.id===page.imageId),img=$('lessonPreviewImage'),token=++lessonPreviewGeneration;lessonPreviewPageId=page.id;img.hidden=true;setLessonPreviewSvgHidden(true);img.src=imageIO.urlFor(asset);
    try{await img.decode();}catch{if(token===lessonPreviewGeneration)$('lessonPreviewStatus').textContent=t('error_DECODE_FAILED');return;}if(token!==lessonPreviewGeneration||!lessonPreviewSession)return;img.hidden=false;$('lessonPreviewStatus').textContent=t('lessonPreviewNote');renderLessonPreview();setLessonPreviewSvgHidden(false);
  }
  async function openLessonPreview(){
    if(busy||!doc.questions.length||!playerTemplate)return;resetLessonPreview();lessonPreviewSession=core.startSession(doc,{mode:'free'},ctx);lessonPreviewPageId=doc.pages[0].id;$('lessonPreviewDialog').showModal();$('lessonPreviewStatus').textContent=t('preparing');await showLessonPreviewPage(lessonPreviewPageId);
  }
  async function showPreview(force=false) {
    const page=doc.pages.find(p=>p.id===selectedId),asset=page&&doc.assets.find(a=>a.id===page.imageId);
    if(!asset){viewKey='';displayGeneration++;image.hidden=true;setSvgHidden(true);image.removeAttribute('src');$('previewWait').hidden=true;return;}
    if(!force&&viewKey===asset.id){renderOverlay();return;}
    viewKey=asset.id;const token=++displayGeneration,sourceGeneration=generation;
    image.hidden=true;setSvgHidden(true);$('previewWait').hidden=false;$('previewWait').textContent=t('preparing');
    try {
      image.src=imageIO.urlFor(asset);
      await image.decode();
      if(token!==displayGeneration||sourceGeneration!==generation)return;
      image.alt=t('imageAlt',{name:page.title});image.hidden=false;$('previewWait').hidden=true;renderOverlay();
    }catch{
      if(token!==displayGeneration||sourceGeneration!==generation)return;
      image.hidden=true;setSvgHidden(true);image.removeAttribute('src');viewKey='';$('previewWait').textContent=t('error_DECODE_FAILED');
    }
  }
  function derivedMutation(oldDoc,nextDoc){
    const oldIds=new Set(oldDoc.questions.map(question=>question.id)),nextIds=new Set(nextDoc.questions.map(question=>question.id));
    return {document:nextDoc,affectedQuestionIds:nextDoc.questions.filter(question=>{const old=oldDoc.questions.find(item=>item.id===question.id);return old&&old.revision!==question.revision;}).map(question=>question.id),deletedQuestionIds:oldDoc.questions.filter(question=>!nextIds.has(question.id)).map(question=>question.id),addedQuestionIds:nextDoc.questions.filter(question=>!oldIds.has(question.id)).map(question=>question.id)};
  }
  function reconcileStudyEdit(oldDoc,mutationResult){
    if(!studyEditActive||!studySession)return;studySession=core.reconcileSession(studySession,oldDoc,mutationResult);
    if(!studyEditImpact)studyEditImpact={changed:new Set(),deleted:new Set(),added:new Set()};
    for(const id of mutationResult.affectedQuestionIds||[])studyEditImpact.changed.add(id);for(const id of mutationResult.deletedQuestionIds||[]){studyEditImpact.deleted.add(id);studyEditImpact.changed.delete(id);}for(const id of mutationResult.addedQuestionIds||[])studyEditImpact.added.add(id);
  }
  function invalidatePreparedExport(){
    projectIO.invalidateExport(exportGeneration);exportGeneration++;preparedLessonExport=null;exportBusy=false;
  }
  function commit(nextOrMutation,maskId=selectedMaskId) {
    const oldDoc=doc,mutationResult=nextOrMutation?.document?nextOrMutation:derivedMutation(oldDoc,nextOrMutation),next=mutationResult.document;
    undo.push(doc);if(undo.length>core.limits.maxUndo)undo.shift();redo=[];doc=next;invalidatePreparedExport();selectedMaskId=maskId;reconcileStudyEdit(oldDoc,mutationResult);scheduleDraftSave();
  }
  function history(direction) {
    if(busy||mode==='study')return;
    const from=direction==='undo'?undo:redo,to=direction==='undo'?redo:undo;if(!from.length)return;
    const oldDoc=doc;to.push(doc);const snapshot=from.pop(),revisionMap=new Map(doc.questions.map(question=>[question.id,question.revision]));
    const next={...snapshot,revision:doc.revision+1,questions:snapshot.questions.map(question=>({...question,revision:Math.max(question.revision,revisionMap.get(question.id)||question.revision)}))};
    const mutationResult=derivedMutation(oldDoc,next);doc=next;invalidatePreparedExport();reconcileStudyEdit(oldDoc,mutationResult);
    if(!doc.pages.some(p=>p.id===selectedId))selectedId=doc.pages.at(-1)?.id||null;
    if(!doc.masks.some(m=>m.id===selectedMaskId))selectedMaskId=null;selectedMaskIds=new Set([...selectedMaskIds].filter(id=>doc.masks.some(mask=>mask.id===id)));
    status(direction==='undo'?'undone':'redone');scheduleDraftSave();refreshCopy();showPreview();
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
    generation++;controller?.abort();invalidatePreparedExport();doc=core.newDocument(ctx,t('untitled'));selectedId=null;selectedMaskId=null;selectedMaskIds.clear();
    undo=[];redo=[];failures=[];studySession=null;mode='create';tool='move';twoPointStart=null;filenameBase='reveal-sheet';$('outputFilename').value=filenameBase;imageIO.releaseAll();status('emptyStatus');refreshCopy();showPreview();
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
  function addCover(rect){const before=new Set(doc.masks.map(m=>m.id)),result=core.applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId:selectedId,rect},ctx),added=result.document.masks.find(m=>!before.has(m.id));commit(result,added?.id||null);status('coverAdded');tool='move';twoPointStart=null;clearDraft();refreshCopy();}
  function pointerDown(event){if(mode!=='create'||tool!=='cover'||event.button!==0)return;const point=imagePoint(event);if(!point)return;event.preventDefault();gesture={pointerId:event.pointerId,start:point,current:point};svg.setPointerCapture(event.pointerId);}
  function pointerMove(event){if(!gesture||event.pointerId!==gesture.pointerId)return;const point=imagePoint(event);if(point){gesture.current=point;drawDraft(gesture.start,point);}}
  function pointerUp(event){if(!gesture||event.pointerId!==gesture.pointerId)return;const start=gesture.start,point=imagePoint(event)||gesture.current;svg.releasePointerCapture(event.pointerId);clearDraft();const rect=rectFromPoints(start,point);if(rect)addCover(rect);else{tool='move';updateToolButtons();}}
  function pointerCancel(){if(!gesture)return;clearDraft();tool='move';updateToolButtons();}
  function twoPoint(event){if(mode!=='create'||tool!=='two-point'||event.target!==svg)return;const point=imagePoint(event);if(!point)return;if(!twoPointStart){twoPointStart=point;status('chooseSecondPoint');return;}const rect=rectFromPoints(twoPointStart,point);twoPointStart=null;if(rect)addCover(rect);else status('coverTooSmall');}
  function handleViewAction(action){if(action.type==='SELECT_MASK'){selectedMaskId=action.maskId;selectedMaskIds=new Set([action.maskId]);refreshCopy();return;}if(mode!=='study')return;if(action.type==='TOGGLE_QUESTION'&&studySession?.mode==='free'){studySession=core.toggleFree(studySession,action.questionId);scheduleStudySave();refreshCopy();return;}if(action.type==='REVEAL_CURRENT'&&studySession?.mode==='guided'&&action.questionId===currentGuidedId()){revealGuided();}}
  function editSelected(kind,amount=1){const mask=currentMask(),asset=currentAsset();if(!mask||!asset||mode!=='create')return;const dx=amount/asset.width,dy=amount/asset.height;let r={...mask.rect};if(kind==='left')r.x-=dx;if(kind==='right')r.x+=dx;if(kind==='up')r.y-=dy;if(kind==='down')r.y+=dy;if(kind==='wider')r.w+=dx;if(kind==='narrower')r.w-=dx;if(kind==='taller')r.h+=dy;if(kind==='shorter')r.h-=dy;try{const result=core.applyCommand(doc,{type:'SET_MASK_RECT',maskId:mask.id,rect:r},ctx);commit(result,mask.id);status('coverChanged');refreshCopy();}catch(error){if(error.code!=='INVALID_SHEET')throw error;}}
  function deleteSelected(){const mask=currentMask();if(!mask)return;const result=core.applyCommand(doc,{type:'DELETE_MASK',maskId:mask.id},ctx);commit(result,null);status('coverDeleted');refreshCopy();}
  function duplicateSelected(){const mask=currentMask();if(!mask)return;const before=new Set(doc.masks.map(m=>m.id)),result=core.applyCommand(doc,{type:'DUPLICATE_MASK',maskId:mask.id},ctx),added=result.document.masks.find(m=>!before.has(m.id));commit(result,added?.id||null);status('coverAdded');refreshCopy();}
  function groupSelected(){
    const page=currentPage();if(!page||busy)return;const chosen=doc.masks.filter(mask=>mask.pageId===page.id&&selectedMaskIds.has(mask.id));
    const questionIds=[...new Set(chosen.filter(mask=>mask.kind==='answer').map(mask=>mask.questionId))];if(chosen.some(mask=>mask.kind!=='answer')||questionIds.length<2)return;
    const result=core.applyCommand(doc,{type:'GROUP_QUESTIONS',questionIds},ctx);commit(result,null);selectedMaskIds.clear();status('groupedCovers');refreshCopy();
  }
  function ungroupSelected(){
    const page=currentPage();if(!page||busy)return;const chosen=doc.masks.filter(mask=>mask.pageId===page.id&&selectedMaskIds.has(mask.id));if(chosen.length!==1||chosen[0].kind!=='answer')return;
    const question=doc.questions.find(item=>item.id===chosen[0].questionId);if(!question||question.maskIds.length<2)return;
    const result=core.applyCommand(doc,{type:'UNGROUP_QUESTION',questionId:question.id},ctx);commit(result,chosen[0].id);selectedMaskIds=new Set([chosen[0].id]);status('ungroupedCovers');refreshCopy();
  }
  function convertSelected(kind){
    const page=currentPage();if(!page||busy)return;const chosen=doc.masks.filter(mask=>mask.pageId===page.id&&selectedMaskIds.has(mask.id));if(chosen.length!==1||chosen[0].kind===kind)return;
    const result=core.applyCommand(doc,{type:'CONVERT_MASK_KIND',maskId:chosen[0].id,kind},ctx);commit(result,chosen[0].id);selectedMaskIds=new Set([chosen[0].id]);status(kind==='auxiliary'?'madeAuxiliary':'madeAnswer');refreshCopy();
  }
  function duplicateSelection(){
    const page=currentPage();if(!page||busy)return;const ids=doc.masks.filter(mask=>mask.pageId===page.id&&selectedMaskIds.has(mask.id)).map(mask=>mask.id);if(!ids.length)return;
    const before=new Set(doc.masks.map(mask=>mask.id)),result=core.applyCommand(doc,{type:'DUPLICATE_SELECTION',maskIds:ids},ctx),newIds=result.document.masks.filter(mask=>!before.has(mask.id)).map(mask=>mask.id);
    commit(result,newIds[0]||null);selectedMaskIds=new Set(newIds);status('duplicatedSelection');refreshCopy();
  }
  function renamePage(){
    const page=currentPage();if(!page||busy)return;const title=$('pageTitleInput').value;
    try{const result=core.applyCommand(doc,{type:'RENAME_PAGE',pageId:page.id,title},ctx);if(result.document!==doc){commit(result,selectedMaskId);status('pageRenamed');refreshCopy();}}
    catch(error){$('pageTitleInput').value=page.title;}
  }
  function movePage(delta){const page=currentPage();if(!page||busy)return;const result=core.applyCommand(doc,{type:'MOVE_PAGE',pageId:page.id,delta},ctx);if(result.document!==doc){commit(result,selectedMaskId);status('pageMoved');refreshCopy();}}
  async function deletePage(){
    const page=currentPage();if(!page||busy)return;const index=doc.pages.findIndex(item=>item.id===page.id),count=doc.questions.filter(question=>question.pageId===page.id).length;
    const yes=await env.AppConfirm.ask({title:t('pageDeleteTitle'),message:t('pageDeleteMessage',{name:page.title,count}),confirmLabel:t('pageDeleteAction'),cancelLabel:t('cancel'),tone:'danger'});if(!yes)return;
    const imageId=page.imageId,result=core.applyCommand(doc,{type:'DELETE_PAGE',pageId:page.id},ctx),next=result.document;commit(result,null);
    if(!next.assets.some(asset=>asset.id===imageId))imageIO.release(imageId);
    selectedId=next.pages[Math.min(index,next.pages.length-1)]?.id||null;viewKey='';status('pageDeleted');refreshCopy();showPreview(true);
  }
  function startStudySession(nextMode=studyMode,otherAnswers=null){studyMode=nextMode;previousStudySummary=null;studySession=core.startSession(doc,{mode:nextMode,...(nextMode==='guided'?{otherAnswers:otherAnswers||doc.defaults.otherAnswers}:{})},ctx);studyConflict=false;const pageChanged=syncGuidedPage();scheduleStudySave();refreshCopy();if(pageChanged)showPreview(true);}
  async function switchStudyMode(nextMode){if(mode!=='study'||studyMode===nextMode)return;const proceed=!studyHasProgress(studySession)||await env.AppConfirm.ask({title:t('studyRestartTitle'),message:t('studyRestartMessage'),confirmLabel:t('studyRestartAction'),cancelLabel:t('cancel')});if(!proceed){refreshCopy();return;}startStudySession(nextMode);}
  async function changeOtherAnswers(value){if(mode!=='study'||studyMode!=='guided'||!['hidden','visible'].includes(value)||value===studySession.otherAnswers)return;const proceed=!studyHasProgress(studySession)||await env.AppConfirm.ask({title:t('studyRestartTitle'),message:t('studyRestartMessage'),confirmLabel:t('studyRestartAction'),cancelLabel:t('cancel')});if(!proceed){refreshCopy();return;}startStudySession('guided',value);}
  function revealGuided(){if(studySession?.mode!=='guided')return;studySession=core.revealCurrent(studySession,studySession.epoch);scheduleStudySave();refreshCopy();}
  function rateGuided(rating){if(studySession?.mode!=='guided')return;const qid=currentGuidedId(),epoch=studySession.epoch;if(!qid)return;studySession=core.rate(studySession,qid,rating,epoch);scheduleStudySave();const pageChanged=syncGuidedPage();refreshCopy();if(pageChanged)showPreview(true);}
  function skipGuided(){if(studySession?.mode!=='guided'||!currentGuidedId())return;studySession=core.skip(studySession,studySession.epoch);scheduleStudySave();const pageChanged=syncGuidedPage();refreshCopy();if(pageChanged)showPreview(true);}
  function finishGuided(){if(studySession?.mode!=='guided')return;studySession=core.finishSession(studySession,studySession.epoch);scheduleStudySave();refreshCopy();}
  function goGuidedQuestion(qid){if(studySession?.mode!=='guided')return;studySession=core.goToQuestion(studySession,qid);scheduleStudySave();const pageChanged=syncGuidedPage();refreshCopy();if(pageChanged)showPreview(true);}
  function previousGuided(){if(studySession?.mode!=='guided'||!studySession.queue.length)return;const index=studySession.ended?studySession.queue.length-1:Math.max(0,studySession.index-1);goGuidedQuestion(studySession.queue[index].questionId);}
  function reviewGuided(kind){if(studySession?.mode!=='guided')return;const previous=core.summary(studySession),next=core.makeReviewSession(doc,studySession,kind,ctx);if(!next)return;previousStudySummary=previous;studySession=next;studyMode='guided';studyConflict=false;scheduleStudySave();const pageChanged=syncGuidedPage();refreshCopy();if(pageChanged)showPreview(true);}
  function editCurrentQuestion(){
    const qid=currentGuidedId();if(mode!=='study'||studySession?.mode!=='guided'||!qid)return;const question=doc.questions.find(item=>item.id===qid);if(!question)return;
    studyEditActive=true;studyEditImpact={changed:new Set(),deleted:new Set(),added:new Set()};mode='create';selectedId=question.pageId;selectedMaskId=question.maskIds[0]||null;selectedMaskIds=new Set(question.maskIds);tool='move';refreshCopy();showPreview();
  }
  function returnToStudy(){
    if(!studyEditActive||!studySession)return;studyEditActive=false;mode='study';selectedMaskId=null;selectedMaskIds.clear();const impact=studyEditImpact||{changed:new Set(),deleted:new Set(),added:new Set()};studyEditImpact=null;const pageChanged=syncGuidedPage();status('studyEditSummary',{changed:impact.changed.size,deleted:impact.deleted.size,added:impact.added.size});studyConflict=false;scheduleStudySave();refreshCopy();if(pageChanged)showPreview(true);else showPreview();
  }
  async function beginStudy(){
    if(!doc.questions.length||busy)return;studyEditActive=false;studyEditImpact=null;tool='move';selectedMaskId=null;previousStudySummary=null;studyConflict=false;
    studyMode=doc.defaults.mode||'free';let restored=null,identity=null;
    if(localAvailable&&persistence.settings.studyOptIn){
      identity=await currentStudyIdentity();if(identity){try{restored=await persistence.loadSession(identity);}catch{setStudyStatus('studySaveFailed');}}
    }
    if(restored){
      localStudyExists=true;refreshLocalStudy();const yes=await env.AppConfirm.ask({title:t('resumeStudyTitle'),message:t('resumeStudyMessage'),confirmLabel:t('resumeStudyAction'),cancelLabel:t('startStudyFreshAction')});
      studyRecordGeneration=restored.generation;studyIdentityToken=identityToken(identity);
      if(yes){studySession=restored.session;studyMode=studySession.mode;setStudyStatus('studyRestored');}
      else{studySession=core.startSession(doc,{mode:studyMode,...(studyMode==='guided'?{otherAnswers:doc.defaults.otherAnswers}:{})},ctx);scheduleStudySave();}
    }else{
      studyRecordGeneration=0;studyIdentityToken=identity?identityToken(identity):'';studySession=core.startSession(doc,{mode:studyMode,...(studyMode==='guided'?{otherAnswers:doc.defaults.otherAnswers}:{})},ctx);scheduleStudySave();
    }
    mode='study';const pageChanged=syncGuidedPage();refreshCopy();if(pageChanged)showPreview(true);
  }
  function beginCreate(){scheduleStudySave();studyEditActive=false;studyEditImpact=null;mode='create';studySession=null;previousStudySummary=null;refreshCopy();$('addButton').focus({preventScroll:true});}
  async function prepareLessonExport(){
    if(!doc.questions.length||!playerTemplate)return null;
    const token=exportGeneration,snapshot=doc;exportBusy=true;preparedLessonExport=null;status('exportPreparing');refreshCopy();
    try{
      const prepared=await projectIO.prepareExport(snapshot,{kind:'html',filename:$('outputFilename').value,playerTemplate,appVersion,preview:true},token);
      if(token!==exportGeneration||snapshot!==doc)return null;
      preparedLessonExport=prepared;status('exportReady',{size:formatBytes(prepared.size)});return prepared;
    }catch(error){
      if(token!==exportGeneration||error?.code==='EXPORT_FAILED')return null;
      status('error_'+(error?.code||'EXPORT_FAILED'));return null;
    }finally{
      if(token===exportGeneration){exportBusy=false;refreshCopy();}
    }
  }
  function beginSave(){
    if(!doc.pages.length||busy)return;scheduleStudySave();studyEditActive=false;studyEditImpact=null;mode='save';studySession=null;selectedMaskId=null;preparedLessonExport=null;
    refreshCopy();$('outputFilename').focus({preventScroll:true});if(doc.questions.length&&playerTemplate)prepareLessonExport();
  }
  function applyImported(envelope,{fromLocal=false}={}){
    generation++;cancelStudyTimer();studyRecordGeneration=0;studyIdentityToken='';studyConflict=false;invalidatePreparedExport();controller?.abort();imageIO.releaseAll();doc=envelope.document;selectedId=doc.pages[0]?.id||null;selectedMaskId=null;selectedMaskIds.clear();undo=[];redo=[];failures=[];studySession=null;studyEditActive=false;studyEditImpact=null;mode='create';tool='move';twoPointStart=null;viewKey='';
    filenameBase=doc.title&&doc.title!==t('untitled')?doc.title:'reveal-sheet';$('outputFilename').value=filenameBase;status(fromLocal?'draftRestored':'sheetOpened');refreshCopy();showPreview(true);if(!fromLocal)scheduleDraftSave();
  }
  async function openSheet(file){
    if(busy||!file)return;busy=true;status('openingSheet');refreshCopy();const localController=new env.AbortController();controller=localController;
    try{
      const loaded=await projectIO.readSheet(file,{signal:localController.signal});
      if(localController.signal.aborted)return;
      busy=false;controller=null;refreshCopy();
      if(doc.pages.length){
        const yes=await env.AppConfirm.ask({title:t('replaceSheetTitle'),message:t('replaceSheetMessage'),confirmLabel:t('replaceSheetAction'),cancelLabel:t('cancel'),tone:'danger'});
        if(!yes){status('sheetOpenCancelled');refreshCopy();return;}
      }
      applyImported(loaded);
    }catch(error){
      if(controller===localController)controller=null;busy=false;
      const code=['UNSUPPORTED_SCHEMA','LIMIT_EXCEEDED','INVALID_SHEET'].includes(error?.code)?error.code:'INVALID_SHEET';
      status('error_'+code);refreshCopy();
    }
  }
  async function downloadPrepared(kind){
    if(busy||exportBusy||!doc.pages.length||(kind==='html'&&(!doc.questions.length||!playerTemplate)))return;
    const token=exportGeneration,snapshot=doc;exportBusy=true;status('exportPreparing');refreshCopy();
    try{
      const prepared=await projectIO.prepareExport(snapshot,{kind,filename:$('outputFilename').value,playerTemplate,appVersion},token);
      if(token!==exportGeneration||snapshot!==doc)return;
      projectIO.requestDownload(prepared);
      if(kind==='html')preparedLessonExport=prepared;
      filenameBase=prepared.filename.replace(kind==='html'?/\.reveal\.html$/i:/\.reveal\.json$/i,'');$('outputFilename').value=filenameBase;
      status('saveStarted',{name:prepared.filename});refreshCopy();
    }catch(error){
      if(token!==exportGeneration)return;
      status('error_'+(error?.code||'EXPORT_FAILED'));refreshCopy();
    }finally{
      if(token===exportGeneration){exportBusy=false;refreshCopy();}
    }
  }
  function downloadJson(){return downloadPrepared('json');}
  function downloadHtml(){return downloadPrepared('html');}
  function keydown(event){if(editableTarget(event.target)||env.document.querySelector('dialog[open]'))return;if(mode==='study'&&studySession?.mode==='guided'){if(event.key===' '){event.preventDefault();revealGuided();}else if(event.key==='1'){event.preventDefault();if(studySession.stage==='revealed')rateGuided('recalled');}else if(event.key==='2'){event.preventDefault();if(studySession.stage==='revealed')rateGuided('again');}else if(event.key.toLowerCase()==='s'){event.preventDefault();skipGuided();}else if(event.key==='ArrowLeft'){event.preventDefault();previousGuided();}return;}if(mode!=='create'||!currentMask())return;const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};if(map[event.key]){event.preventDefault();editSelected(map[event.key],event.shiftKey?10:1);}else if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();deleteSelected();}else if(event.key==='Escape'){selectedMaskId=null;tool='move';twoPointStart=null;pointerCancel();refreshCopy();}}
  function destroy(){generation++;invalidatePreparedExport();cancelDraftTimer();cancelStudyTimer();resetLessonPreview();controller?.abort();imageIO.releaseAll();studyView.destroy();image.hidden=true;setSvgHidden(true);image.removeAttribute('src');}
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
  $('pageTitleInput').addEventListener('change',renamePage);$('pageTitleInput').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}});
  $('pagePrevButton').addEventListener('click',()=>movePage(-1));$('pageNextButton').addEventListener('click',()=>movePage(1));$('pageDeleteButton').addEventListener('click',deletePage);
  $('groupButton').addEventListener('click',groupSelected);$('ungroupButton').addEventListener('click',ungroupSelected);$('makeAuxiliaryButton').addEventListener('click',()=>convertSelected('auxiliary'));$('makeAnswerButton').addEventListener('click',()=>convertSelected('answer'));$('duplicateSelectionButton').addEventListener('click',duplicateSelection);
  $('freeModeButton').addEventListener('click',()=>switchStudyMode('free'));$('guidedModeButton').addEventListener('click',()=>switchStudyMode('guided'));$('otherAnswersHidden').addEventListener('change',event=>{if(event.target.checked)changeOtherAnswers('hidden');});$('otherAnswersVisible').addEventListener('change',event=>{if(event.target.checked)changeOtherAnswers('visible');});$('revealCurrentButton').addEventListener('click',revealGuided);$('recalledButton').addEventListener('click',()=>rateGuided('recalled'));$('againButton').addEventListener('click',()=>rateGuided('again'));$('skipButton').addEventListener('click',skipGuided);$('previousQuestionButton').addEventListener('click',previousGuided);$('finishStudyButton').addEventListener('click',finishGuided);$('reviewAgainButton').addEventListener('click',()=>reviewGuided('again'));$('reviewUncheckedButton').addEventListener('click',()=>reviewGuided('unchecked'));
  $('viewLeft').addEventListener('click',()=>nudgeView(-1,0));$('viewRight').addEventListener('click',()=>nudgeView(1,0));$('viewUp').addEventListener('click',()=>nudgeView(0,-1));$('viewDown').addEventListener('click',()=>nudgeView(0,1));$('viewZoomIn').addEventListener('click',()=>zoomView(1.25));$('viewZoomOut').addEventListener('click',()=>zoomView(.8));$('viewFit').addEventListener('click',fitView);$('focusQuestionButton').addEventListener('click',focusCurrentQuestion);$('editCurrentQuestionButton').addEventListener('click',editCurrentQuestion);$('returnToStudyButton').addEventListener('click',returnToStudy);
  $('previewLessonButton').addEventListener('click',openLessonPreview);$('lessonPreviewClose').addEventListener('click',()=>$('lessonPreviewDialog').close());$('lessonPreviewDialog').addEventListener('close',resetLessonPreview);
  $('draftOptIn').addEventListener('change',changeDraftOptIn);$('studyOptIn').addEventListener('change',changeStudyOptIn);$('clearDraftButton').addEventListener('click',clearDraftLocal);$('clearStudyButton').addEventListener('click',clearStudyLocal);$('resolveConflictSaveButton').addEventListener('click',beginSave);$('resolveConflictReloadButton').addEventListener('click',reloadConflictDraft);
  $('studyButton').addEventListener('click',beginStudy);$('createButton').addEventListener('click',beginCreate);$('saveButton').addEventListener('click',beginSave);$('downloadJsonButton').addEventListener('click',downloadJson);$('downloadHtmlButton').addEventListener('click',downloadHtml);$('openButton').addEventListener('click',()=>$('sheetInput').click());$('sheetInput').addEventListener('change',event=>{const file=event.target.files?.[0]||null;event.target.value='';openSheet(file);});$('hideAllButton').addEventListener('click',()=>{studySession=core.hideAllFree(studySession);scheduleStudySave();refreshCopy();});$('revealPageButton').addEventListener('click',()=>{studySession=core.revealPageFree(doc,studySession,selectedId);scheduleStudySave();refreshCopy();});
  svg.addEventListener('pointerdown',pointerDown);svg.addEventListener('pointermove',pointerMove);svg.addEventListener('pointerup',pointerUp);svg.addEventListener('pointercancel',pointerCancel);svg.addEventListener('click',twoPoint);
  env.document.addEventListener('keydown',keydown);
  env.document.addEventListener('paste',paste);
  env.document.addEventListener('dragover',event=>{if(Array.from(event.dataTransfer?.types||[]).includes('Files'))event.preventDefault();});
  $('dropZone').addEventListener('dragover',event=>{event.preventDefault();if(!busy)$('dropZone').classList.add('drag-over');});
  $('dropZone').addEventListener('dragleave',()=>$('dropZone').classList.remove('drag-over'));
  env.document.addEventListener('drop',drop);
  env.addEventListener('pagehide',()=>{controller?.abort();imageIO.releaseAll();viewKey='';image.hidden=true;setSvgHidden(true);});
  env.addEventListener('pageshow',()=>{if(doc.pages.length)showPreview(true);});
  env.addEventListener('beforeunload',event=>{if(doc.pages.length){event.preventDefault();event.returnValue='';}});
  function localize(){if(mode==='save'&&exportBusy){invalidatePreparedExport();status('exportChanged');}refreshCopy();if(lessonPreviewSession)renderLessonPreview();const page=doc.pages.find(p=>p.id===selectedId);if(page)image.alt=t('imageAlt',{name:page.title});}
  refreshCopy();showPreview();initPersistence();
  return Object.freeze({localize,destroy});
}
