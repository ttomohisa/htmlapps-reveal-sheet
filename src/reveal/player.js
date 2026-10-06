/** Study-only runtime for exported Reveal Sheet lessons. No editing canvas or external import. */
function createPlayer({core,projectIO,persistence,env,envelope}) {
  const $=id=>env.document.getElementById(id),doc=envelope.document;
  if(!core.validateEnvelope(envelope).ok||envelope.kind!=='lesson')throw core.error('INVALID_SHEET');
  let language=(env.navigator?.language||'en').toLowerCase().startsWith('ja')?'ja':'en';
  let pageId=doc.pages[0].id,session=core.startSession(doc,{mode:doc.defaults.mode,otherAnswers:doc.defaults.otherAnswers}),mode=session.mode;
  let imageGeneration=0,studyView=null,pendingConfirm=null,studyGeneration=0,studyIdentity=null,saveTimer=0,persistenceAvailable=false;
  const tr={
    ja:{titleSuffix:'学習教材',free:'自由にめくる',guided:'一問ずつ',checked:'確認済み',hideAll:'全部隠す',revealPage:'このページの答えをすべて表示',reveal:'答えを見る',recalled:'思い出せた',again:'もう一度',skip:'飛ばす',previous:'前の問題',finish:'学習を終える',results:'今回の結果',total:'対象',unanswered:'未回答',reviewAgain:'もう一度だけ確認',reviewUnchecked:'未確認を確認',otherAnswers:'ほかの答え',hideOthers:'ほかの答えも隠す',showOthers:'ほかの答えは見せる',saveEditable:'編集データを保存',saveConfirmTitle:'編集データを保存しますか？',saveConfirm:'画像・ページ・問題・覆いを含む編集データを保存します。個人の学習結果は含めません。',saveAction:'保存を開始',cancel:'キャンセル',help:'使い方と注意',helpBody:'覆いを押して自由に確認するか、一問ずつ答えを見て自己評価できます。この教材を直す場合はReveal Sheet本体でこの.reveal.htmlを選び直してください。',studySave:'この端末に学習の続きだけを残す',studySaveNote:'初期OFF。画像は保存せず、この教材に一致する小さい学習記録だけを保存します。',studyUnavailable:'この起動方法では学習記録を保存できません。学習自体は利用できます。',studySaved:'学習の続きを端末内に保存しました。',studyOff:'学習記録はOFFです。',enableStudyTitle:'学習の続きをこの端末に残しますか？',enableStudyMessage:'問題の進み具合と自己評価だけをこのブラウザに保存します。画像は学習記録に含めません。',enable:'ONにする',resumeTitle:'学習の続きがあります',resumeMessage:'この教材と内容が一致する学習の続きがあります。答えを閉じた状態で再開しますか？',continue:'続きから',fresh:'最初から'},
    en:{titleSuffix:'Study lesson',free:'Reveal freely',guided:'One at a time',checked:'Checked',hideAll:'Hide all',revealPage:'Reveal all answers on this page',reveal:'Reveal answer',recalled:'Recalled',again:'Review again',skip:'Skip',previous:'Previous',finish:'Finish study',results:'This session',total:'Total',unanswered:'Unanswered',reviewAgain:'Review again only',reviewUnchecked:'Review unchecked',otherAnswers:'Other answers',hideOthers:'Hide other answers',showOthers:'Show other answers',saveEditable:'Save editable sheet',saveConfirmTitle:'Save editable sheet?',saveConfirm:'Save images, pages, questions and covers as editable data. Personal study results are not included.',saveAction:'Start save',cancel:'Cancel',help:'How to use & notes',helpBody:'Reveal covers freely or study one question at a time. To edit this lesson, open Reveal Sheet and choose this .reveal.html file again.',studySave:'Keep only study progress on this device',studySaveNote:'Off by default. Stores only a small matching study record without images.',studyUnavailable:'Study progress cannot be saved in this launch mode. Studying still works.',studySaved:'Saved study progress on this device.',studyOff:'Study progress saving is off.',enableStudyTitle:'Keep study progress on this device?',enableStudyMessage:'Only question progress and self-assessment are stored in this browser. Images are not stored in the study record.',enable:'Enable',resumeTitle:'Saved study progress found',resumeMessage:'Matching study progress exists for this exact lesson. Continue with the current answer closed?',continue:'Continue',fresh:'Start fresh'}
  };
  const t=key=>tr[language][key]||key;
  function confirmAsk({title,message,ok,cancel=t('cancel')}){return new Promise(resolve=>{pendingConfirm=resolve;$('lessonConfirmTitle').textContent=title;$('lessonConfirmMessage').textContent=message;$('lessonConfirmOk').textContent=ok;$('lessonConfirmCancel').textContent=cancel;$('lessonConfirmDialog').showModal();});}
  function finishConfirm(value){if(!$('lessonConfirmDialog').open)return;$('lessonConfirmDialog').close();const fn=pendingConfirm;pendingConfirm=null;fn?.(value);}
  function page(){return doc.pages.find(item=>item.id===pageId)||doc.pages[0];}
  function asset(){const p=page();return doc.assets.find(item=>item.id===p.imageId);}
  function currentGuidedId(){return session.mode==='guided'&&!session.ended?session.queue[session.index]?.questionId||null:null;}
  function visibleSvg(hidden){if(hidden)$('maskSvg').setAttribute('hidden','');else $('maskSvg').removeAttribute('hidden');}
  async function showPage(nextId){
    const next=doc.pages.find(item=>item.id===nextId);if(!next)return;pageId=next.id;const a=doc.assets.find(item=>item.id===next.imageId),token=++imageGeneration,img=$('previewImage');
    img.hidden=true;visibleSvg(true);img.src='data:image/png;base64,'+a.dataBase64;
    try{await img.decode();}catch{if(token===imageGeneration)$('lessonError').hidden=false;return;}
    if(token!==imageGeneration)return;img.hidden=false;studyView.mount({document:doc,pageId:next.id,session,mode:'study',selectedMaskId:null,selectedMaskIds:[]});visibleSvg(false);renderPages();
  }
  function renderPages(){
    const list=$('lessonPages');list.replaceChildren();doc.pages.forEach((p,index)=>{const b=env.document.createElement('button');b.type='button';b.className='lesson-page-button';b.textContent=(index+1)+'. '+p.title;b.setAttribute('aria-pressed',String(p.id===pageId));b.addEventListener('click',()=>showPage(p.id));list.append(b);});
  }
  function syncGuidedPage(){
    const qid=currentGuidedId();if(!qid)return false;const q=doc.questions.find(item=>item.id===qid);if(!q||q.pageId===pageId)return false;pageId=q.pageId;showPage(pageId);return true;
  }
  function summaryGuided(){return core.summary(session);}
  function render(){
    $('lessonFreeMode').setAttribute('aria-pressed',String(mode==='free'));$('lessonGuidedMode').setAttribute('aria-pressed',String(mode==='guided'));$('lessonFreePanel').hidden=mode!=='free';$('lessonGuidedPanel').hidden=mode!=='guided';
    if(mode==='free'){
      const sum=core.summaryFree(session);$('lessonConfirmedCount').textContent=String(sum.confirmed);$('lessonQuestionCount').textContent=String(sum.total);const open=new Set(session.openQuestionIds),list=$('lessonQuestionList');list.replaceChildren();
      session.queue.forEach((qid,index)=>{const b=env.document.createElement('button');b.type='button';b.className='lesson-question';b.textContent=(open.has(qid)?'✓ ':'')+(index+1);b.addEventListener('click',()=>{session=core.toggleFree(session,qid);scheduleStudySave();render();studyView.render();});list.append(b);});
    }else{
      $('lessonOtherHidden').checked=session.otherAnswers==='hidden';$('lessonOtherVisible').checked=session.otherAnswers==='visible';
      const total=session.queue.length,current=session.ended?total:Math.min(session.index+1,total);$('lessonGuidedProgress').textContent=current+' / '+total;const qid=currentGuidedId(),q=qid&&doc.questions.find(item=>item.id===qid),revealed=Boolean(q&&session.stage==='revealed');
      $('lessonPrompt').hidden=!q?.prompt;$('lessonPrompt').textContent=q?.prompt||'';$('lessonAnswerBox').hidden=!revealed;$('lessonAnswer').textContent=revealed?(q?.answer||''):'';
      $('lessonRevealCurrent').disabled=!q||session.stage!=='hidden';$('lessonRecalled').disabled=!revealed;$('lessonAgain').disabled=!revealed;$('lessonSkip').disabled=!q;$('lessonPrevious').disabled=session.queue.length===0||(!session.ended&&session.index<=0);$('lessonFinish').disabled=session.ended;
      const list=$('lessonGuidedList');list.replaceChildren();session.queue.forEach((item,index)=>{const b=env.document.createElement('button');b.type='button';b.className='lesson-question';b.dataset.rating=session.ratings[item.questionId]||'unanswered';b.textContent=(index+1)+' · '+b.dataset.rating;b.setAttribute('aria-current',String(!session.ended&&index===session.index));b.addEventListener('click',()=>{session=core.goToQuestion(session,item.questionId);syncGuidedPage();scheduleStudySave();render();studyView.render();});list.append(b);});
      const sum=summaryGuided();$('lessonResults').hidden=!session.ended;$('lessonResultTotal').textContent=String(sum.total);$('lessonResultRecalled').textContent=String(sum.recalled);$('lessonResultAgain').textContent=String(sum.again);$('lessonResultSkipped').textContent=String(sum.skipped);$('lessonResultUnanswered').textContent=String(sum.unanswered);$('lessonReviewAgain').hidden=sum.again===0;$('lessonReviewUnchecked').hidden=sum.skipped+sum.unanswered===0;
    }
    studyView?.mount({document:doc,pageId,session,mode:'study',selectedMaskId:null,selectedMaskIds:[]});
  }
  function newSession(nextMode){mode=nextMode;session=core.startSession(doc,{mode:nextMode,...(nextMode==='guided'?{otherAnswers:doc.defaults.otherAnswers}:{})});syncGuidedPage();scheduleStudySave();render();}
  function reveal(){if(session.mode!=='guided')return;session=core.revealCurrent(session,session.epoch);render();studyView.render();}
  function rate(value){const qid=currentGuidedId();if(!qid||session.stage!=='revealed')return;session=core.rate(session,qid,value,session.epoch);syncGuidedPage();scheduleStudySave();render();}
  function skip(){if(session.mode!=='guided'||!currentGuidedId())return;session=core.skip(session,session.epoch);syncGuidedPage();scheduleStudySave();render();}
  function previous(){if(session.mode!=='guided'||!session.queue.length)return;const index=session.ended?session.queue.length-1:Math.max(0,session.index-1);session=core.goToQuestion(session,session.queue[index].questionId);syncGuidedPage();render();}
  function finish(){if(session.mode!=='guided')return;session=core.finishSession(session,session.epoch);scheduleStudySave();render();}
  function review(kind){const next=core.makeReviewSession(doc,session,kind);if(!next)return;session=next;mode='guided';syncGuidedPage();scheduleStudySave();render();}
  function applyLanguage(){
    env.document.documentElement.lang=language;$('lessonTitle').textContent=doc.title+' · '+t('titleSuffix');$('lessonLanguage').textContent=language==='ja'?'EN':'日本語';$('lessonFreeMode').textContent=t('free');$('lessonGuidedMode').textContent=t('guided');$('lessonCheckedLabel').textContent=t('checked');$('lessonHideAll').textContent=t('hideAll');$('lessonRevealPage').textContent=t('revealPage');$('lessonOtherLegend').textContent=t('otherAnswers');$('lessonOtherHiddenText').textContent=t('hideOthers');$('lessonOtherVisibleText').textContent=t('showOthers');$('lessonRevealCurrent').textContent=t('reveal');$('lessonRecalled').textContent=t('recalled');$('lessonAgain').textContent=t('again');$('lessonSkip').textContent=t('skip');$('lessonPrevious').textContent=t('previous');$('lessonFinish').textContent=t('finish');$('lessonResultsTitle').textContent=t('results');$('lessonTotalLabel').textContent=t('total');$('lessonUnansweredLabel').textContent=t('unanswered');$('lessonReviewAgain').textContent=t('reviewAgain');$('lessonReviewUnchecked').textContent=t('reviewUnchecked');$('lessonSaveEditableButton').textContent=t('saveEditable');$('lessonHelpTitle').textContent=t('help');$('lessonHelpBody').textContent=t('helpBody');$('lessonStudyOptInText').textContent=t('studySave');$('lessonStudyOptInNote').textContent=t('studySaveNote');render();
  }
  function downloadEditable(){
    const blob=projectIO.prepareJson(doc,envelope.appVersion),name=projectIO.sanitizeFilename($('lessonFilename').value,'json'),url=env.URL.createObjectURL(blob),a=env.document.createElement('a');a.href=url;a.download=name;a.hidden=true;env.document.body.append(a);a.click();a.remove();env.setTimeout(()=>env.URL.revokeObjectURL(url),0);
  }
  async function saveEditable(){const yes=await confirmAsk({title:t('saveConfirmTitle'),message:t('saveConfirm'),ok:t('saveAction')});if(yes)downloadEditable();}
  async function identity(){const fingerprint=await persistence.fingerprintDocument(doc);return fingerprint?{documentId:doc.id,revision:doc.revision,fingerprint}:null;}
  async function scheduleStudySave(){
    if(saveTimer){env.clearTimeout(saveTimer);saveTimer=0;}if(!persistenceAvailable||!persistence.settings.studyOptIn||!session)return;
    saveTimer=env.setTimeout(async()=>{const id=studyIdentity||await identity();if(!id)return;studyIdentity=id;try{const receipt=await persistence.saveSession(id,session,studyGeneration);if(receipt){studyGeneration=receipt.generation;$('lessonStudyStatus').textContent=t('studySaved');}}catch{$('lessonStudyStatus').textContent=t('studyUnavailable');}},500);
  }
  async function initPersistence(){
    const cap=await persistence.probe();persistenceAvailable=cap.available&&Boolean(env.crypto?.subtle);$('lessonStudyOptIn').disabled=!persistenceAvailable;if(!persistenceAvailable){$('lessonStudyStatus').textContent=t('studyUnavailable');return;}
    $('lessonStudyOptIn').checked=Boolean(persistence.settings.studyOptIn);$('lessonStudyStatus').textContent=persistence.settings.studyOptIn?'':t('studyOff');studyIdentity=await identity();
    if(persistence.settings.studyOptIn&&studyIdentity){let saved=null;try{saved=await persistence.loadSession(studyIdentity);}catch{}if(saved){studyGeneration=saved.generation;const yes=await confirmAsk({title:t('resumeTitle'),message:t('resumeMessage'),ok:t('continue'),cancel:t('fresh')});if(yes){session=saved.session;mode=session.mode;syncGuidedPage();render();}else scheduleStudySave();}}
  }
  async function toggleStudy(event){
    if(event.currentTarget.checked){event.currentTarget.checked=false;const yes=await confirmAsk({title:t('enableStudyTitle'),message:t('enableStudyMessage'),ok:t('enable')});if(!yes)return;try{await persistence.setStudyOptIn(true);event.currentTarget.checked=true;studyGeneration=0;studyIdentity=await identity();scheduleStudySave();}catch{$('lessonStudyStatus').textContent=t('studyUnavailable');}}
    else{try{await persistence.setStudyOptIn(false);studyGeneration=0;$('lessonStudyStatus').textContent=t('studyOff');}catch{$('lessonStudyStatus').textContent=t('studyUnavailable');}}
  }
  function keydown(event){if(/INPUT|TEXTAREA|BUTTON/.test(event.target?.tagName)||$('lessonConfirmDialog').open)return;if(mode==='guided'){if(event.key===' '){event.preventDefault();reveal();}else if(event.key==='1'&&session.stage==='revealed')rate('recalled');else if(event.key==='2'&&session.stage==='revealed')rate('again');else if(event.key.toLowerCase()==='s')skip();else if(event.key==='ArrowLeft')previous();}}
  async function start(){
    studyView=createStudyView({core,dom:env.document,onAction:action=>{if(action.type==='TOGGLE_QUESTION'&&mode==='free'){session=core.toggleFree(session,action.questionId);scheduleStudySave();render();}else if(action.type==='REVEAL_CURRENT'&&mode==='guided'&&action.questionId===currentGuidedId())reveal();}});
    $('lessonFilename').value=doc.title||'reveal-sheet';
    $('lessonFreeMode').addEventListener('click',()=>newSession('free'));$('lessonGuidedMode').addEventListener('click',()=>newSession('guided'));$('lessonHideAll').addEventListener('click',()=>{session=core.hideAllFree(session);render();});$('lessonRevealPage').addEventListener('click',()=>{session=core.revealPageFree(doc,session,pageId);render();});$('lessonRevealCurrent').addEventListener('click',reveal);$('lessonRecalled').addEventListener('click',()=>rate('recalled'));$('lessonAgain').addEventListener('click',()=>rate('again'));$('lessonSkip').addEventListener('click',skip);$('lessonPrevious').addEventListener('click',previous);$('lessonFinish').addEventListener('click',finish);$('lessonReviewAgain').addEventListener('click',()=>review('again'));$('lessonReviewUnchecked').addEventListener('click',()=>review('unchecked'));$('lessonOtherHidden').addEventListener('change',()=>{if(session.mode==='guided'){session={...session,otherAnswers:'hidden'};render();}});$('lessonOtherVisible').addEventListener('change',()=>{if(session.mode==='guided'){session={...session,otherAnswers:'visible'};render();}});
    $('lessonLanguage').addEventListener('click',()=>{language=language==='ja'?'en':'ja';applyLanguage();});$('lessonHelpButton').addEventListener('click',()=>$('lessonHelpDialog').showModal());$('lessonHelpClose').addEventListener('click',()=>$('lessonHelpDialog').close());$('lessonSaveEditableButton').addEventListener('click',saveEditable);$('lessonStudyOptIn').addEventListener('change',toggleStudy);$('lessonConfirmOk').addEventListener('click',()=>finishConfirm(true));$('lessonConfirmCancel').addEventListener('click',()=>finishConfirm(false));env.document.addEventListener('keydown',keydown);
    applyLanguage();renderPages();await showPage(pageId);$('lessonWaiting').hidden=true;$('lessonReady').hidden=false;await initPersistence();
  }
  function destroy(){if(saveTimer)env.clearTimeout(saveTimer);studyView?.destroy();}
  return Object.freeze({start,destroy});
}
