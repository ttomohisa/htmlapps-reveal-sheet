/** Study-only runtime for exported Reveal Sheet lessons. No editing canvas or external import. */
function createPlayer({core,projectIO,persistence,env,envelope}) {
  const $=id=>env.document.getElementById(id),doc=envelope.document;
  if(!core.validateEnvelope(envelope).ok||envelope.kind!=='lesson')throw core.error('INVALID_SHEET');
  let language=(env.navigator?.language||'en').toLowerCase().startsWith('ja')?'ja':'en';
  let pageId=doc.pages[0].id,session=core.startSession(doc,{mode:doc.defaults.mode,otherAnswers:doc.defaults.otherAnswers}),mode=session.mode;
  let imageGeneration=0,studyView=null,pendingConfirm=null,studyGeneration=0,studyIdentity=null,saveTimer=0,persistenceAvailable=false;
  const mobileLayout=env.matchMedia('(max-width:720px)');
  let sheetKind='',sheetOpener=null,sheetMoves=[];
  const tr={
    ja:{titleSuffix:'学習教材',free:'自由にめくる',guided:'一問ずつ',checked:'確認済み',hideAll:'全部隠す',revealPage:'このページの答えをすべて表示',reveal:'答えを見る',recalled:'思い出せた',again:'もう一度',skip:'飛ばす',previous:'前の問題',finish:'学習を終える',results:'今回の結果',total:'対象',unanswered:'未回答',reviewAgain:'もう一度だけ確認',reviewUnchecked:'未確認を確認',otherAnswers:'ほかの答え',hideOthers:'ほかの答えも隠す',showOthers:'ほかの答えは見せる',pagesLabel:'ページ',coversLabel:'画像上の覆い',questionsLabel:'問題',coverLabel:'覆い',coveredAnswerLabel:'閉じている答え',subtitle:'画像で学ぶ暗記シート',pagePosition:'{current} / {total}ページ',previousPage:'前のページ',nextPage:'次のページ',openPages:'ページ一覧',settings:'設定・保存',questions:'問題一覧',studyMode:'学習方法',filenameLabel:'ファイル名',close:'閉じる',rating_unanswered:'未回答',rating_recalled:'思い出せた',rating_again:'もう一度',rating_skipped:'飛ばした',revealedAnswerText:'表示中の答え（平文）',saveEditable:'編集データを保存',saveConfirmTitle:'編集データを保存しますか？',saveConfirm:'画像・ページ・問題・覆いを含む編集データを保存します。個人の学習結果は含めません。',saveAction:'保存を開始',cancel:'キャンセル',help:'使い方と注意事項',helpBody:'覆いを押して自由に確認するか、一問ずつ答えを見て自己評価できます。TabとEnter／Spaceでも主要操作を使えます。画像だけに写っている文字は自動では読み上げられません。平文の答えがある場合も、答えをめくるまでは読み上げ対象へ出しません。この教材を直す場合はReveal Sheet本体でこの.reveal.htmlを選び直してください。',studySave:'この端末に学習の続きだけを残す',studySaveNote:'初期OFF。画像は保存せず、この教材に一致する小さい学習記録だけを保存します。',studyUnavailable:'この起動方法では学習記録を保存できません。学習自体は利用できます。',studySaved:'学習の続きを端末内に保存しました。',studyOff:'学習記録はOFFです。',enableStudyTitle:'学習の続きをこの端末に残しますか？',enableStudyMessage:'問題の進み具合と自己評価だけをこのブラウザに保存します。画像は学習記録に含めません。',enable:'ONにする',resumeTitle:'学習の続きがあります',resumeMessage:'この教材と内容が一致する学習の続きがあります。答えを閉じた状態で再開しますか？',continue:'続きから',fresh:'最初から'},
    en:{titleSuffix:'Study lesson',free:'Reveal freely',guided:'One at a time',checked:'Checked',hideAll:'Hide all',revealPage:'Reveal all answers on this page',reveal:'Reveal answer',recalled:'Recalled',again:'Review again',skip:'Skip',previous:'Previous',finish:'Finish study',results:'This session',total:'Total',unanswered:'Unanswered',reviewAgain:'Review again only',reviewUnchecked:'Review unchecked',otherAnswers:'Other answers',hideOthers:'Hide other answers',showOthers:'Show other answers',pagesLabel:'Pages',coversLabel:'Image covers',questionsLabel:'Questions',coverLabel:'Cover',coveredAnswerLabel:'Covered answer',subtitle:'Study from your images',pagePosition:'Page {current} of {total}',previousPage:'Previous page',nextPage:'Next page',openPages:'Page list',settings:'Settings & save',questions:'Question list',studyMode:'Study mode',filenameLabel:'Filename',close:'Close',rating_unanswered:'Unanswered',rating_recalled:'Recalled',rating_again:'Review again',rating_skipped:'Skipped',revealedAnswerText:'Revealed answer text',saveEditable:'Save editable sheet',saveConfirmTitle:'Save editable sheet?',saveConfirm:'Save images, pages, questions and covers as editable data. Personal study results are not included.',saveAction:'Start save',cancel:'Cancel',help:'How to use & notes',helpBody:'Reveal covers freely or study one question at a time. Main controls also work with Tab and Enter/Space. Reveal Sheet does not automatically read text that exists only in image pixels. Plain-text answer content, when present, is not exposed to assistive output until it is revealed. To edit this lesson, open Reveal Sheet and choose this .reveal.html file again.',studySave:'Keep only study progress on this device',studySaveNote:'Off by default. Stores only a small matching study record without images.',studyUnavailable:'Study progress cannot be saved in this launch mode. Studying still works.',studySaved:'Saved study progress on this device.',studyOff:'Study progress saving is off.',enableStudyTitle:'Keep study progress on this device?',enableStudyMessage:'Only question progress and self-assessment are stored in this browser. Images are not stored in the study record.',enable:'Enable',resumeTitle:'Saved study progress found',resumeMessage:'Matching study progress exists for this exact lesson. Continue with the current answer closed?',continue:'Continue',fresh:'Start fresh'}
  };
  const t=key=>tr[language][key]||key;
  function confirmAsk({title,message,ok,cancel=t('cancel')}){return new Promise(resolve=>{pendingConfirm=resolve;$('lessonConfirmTitle').textContent=title;$('lessonConfirmMessage').textContent=message;$('lessonConfirmOk').textContent=ok;$('lessonConfirmCancel').textContent=cancel;$('lessonConfirmDialog').showModal();});}
  function finishConfirm(value){if(!$('lessonConfirmDialog').open)return;$('lessonConfirmDialog').close();const fn=pendingConfirm;pendingConfirm=null;fn?.(value);}
  function restoreSheet(){
    if(!sheetKind&&!sheetMoves.length)return;
    for(const {node,placeholder} of sheetMoves)placeholder.replaceWith(node);
    sheetMoves=[];const opener=sheetOpener;sheetKind='';sheetOpener=null;
    $('lessonPageToggle').setAttribute('aria-expanded','false');
    if(opener?.isConnected&&!opener.disabled&&opener.getClientRects().length)opener.focus({preventScroll:true});
  }
  function closeSheet(){
    const dialog=$('lessonSheet');if(dialog.open)dialog.close();restoreSheet();
  }
  function openSheet(kind,opener){
    if(!mobileLayout.matches)return;
    const selectors={
      pages:['#lessonPages'],
      questions:[mode==='guided'?'#lessonGuidedList':'#lessonQuestionList'],
      settings:[...(mode==='guided'?['#lessonOtherOptions']:[]),'#lessonPersistence','#lessonSave']
    };
    if(!selectors[kind])return;
    closeSheet();
    sheetKind=kind;sheetOpener=opener||env.document.activeElement;
    const body=$('lessonSheetBody');body.replaceChildren();
    for(const selector of selectors[kind]){
      const node=env.document.querySelector(selector);if(!node)continue;
      const placeholder=env.document.createComment('lesson-sheet-home');
      node.before(placeholder);body.append(node);sheetMoves.push({node,placeholder});
    }
    $('lessonSheetTitle').textContent=t({pages:'pagesLabel',questions:'questions',settings:'settings'}[kind]);
    $('lessonPageToggle').setAttribute('aria-expanded',String(kind==='pages'));
    $('lessonSheet').showModal();$('lessonSheetClose').focus({preventScroll:true});
  }
  function refreshNavigation(){
    const index=doc.pages.findIndex(item=>item.id===pageId);
    const active=page();
    $('lessonPageName').textContent=active?.title||'';
    $('lessonPagePosition').textContent=t('pagePosition').replace('{current}',String(index+1)).replace('{total}',String(doc.pages.length));
    $('lessonPrevPage').disabled=index<=0;
    $('lessonNextPage').disabled=index<0||index>=doc.pages.length-1;
    $('lessonQuestionsButton').disabled=!session.queue.length;
  }
  function stepPage(delta){
    const index=doc.pages.findIndex(item=>item.id===pageId),next=doc.pages[index+delta];
    if(next){closeSheet();showPage(next.id);}
  }
  function page(){return doc.pages.find(item=>item.id===pageId)||doc.pages[0];}
  function asset(){const p=page();return doc.assets.find(item=>item.id===p.imageId);}
  function currentGuidedId(){return session.mode==='guided'&&!session.ended?session.queue[session.index]?.questionId||null:null;}
  function visibleSvg(hidden){if(hidden)$('maskSvg').setAttribute('hidden','');else $('maskSvg').removeAttribute('hidden');}
  async function showPage(nextId){
    const next=doc.pages.find(item=>item.id===nextId);if(!next)return;pageId=next.id;const a=doc.assets.find(item=>item.id===next.imageId),token=++imageGeneration,img=$('previewImage');
    img.hidden=true;visibleSvg(true);img.src='data:image/png;base64,'+a.dataBase64;
    try{await img.decode();}catch{if(token===imageGeneration)$('lessonError').hidden=false;return;}
    if(token!==imageGeneration)return;img.hidden=false;studyView.mount({document:doc,pageId:next.id,session,mode:'study',selectedMaskId:null,selectedMaskIds:[]});visibleSvg(false);renderPages();refreshNavigation();render();
  }
  function renderPages(){
    const list=$('lessonPages');list.replaceChildren();doc.pages.forEach((p,index)=>{const b=env.document.createElement('button');b.type='button';b.className='lesson-page-button';b.textContent=(index+1)+'. '+p.title;b.setAttribute('aria-pressed',String(p.id===pageId));b.addEventListener('click',()=>{closeSheet();showPage(p.id);});list.append(b);});
  }
  function syncGuidedPage(){
    const qid=currentGuidedId();if(!qid)return false;const q=doc.questions.find(item=>item.id===qid);if(!q||q.pageId===pageId)return false;pageId=q.pageId;showPage(pageId);return true;
  }
  function summaryGuided(){return core.summary(session);}
  function render(){
    const activePage=page();$('lessonPageDescription').hidden=!activePage?.description;$('lessonPageDescription').textContent=activePage?.description||'';
    $('lessonFreeMode').setAttribute('aria-pressed',String(mode==='free'));$('lessonGuidedMode').setAttribute('aria-pressed',String(mode==='guided'));$('lessonFreePanel').hidden=mode!=='free';$('lessonGuidedPanel').hidden=mode!=='guided';
    refreshNavigation();
    if(mode==='free'){
      const sum=core.summaryFree(session);$('lessonConfirmedCount').textContent=String(sum.confirmed);$('lessonQuestionCount').textContent=String(sum.total);const open=new Set(session.openQuestionIds),list=$('lessonQuestionList');list.replaceChildren();
      session.queue.forEach((qid,index)=>{const q=doc.questions.find(item=>item.id===qid);if(!q)return;const b=env.document.createElement('button');b.type='button';b.className='lesson-question';const base=(open.has(qid)?'✓ ':'')+(index+1);b.textContent=q.prompt?base+' · '+q.prompt:base;b.addEventListener('click',()=>{closeSheet();session=core.toggleFree(session,qid);scheduleStudySave();render();studyView.render();});list.append(b);});
      const answers=session.queue.filter(qid=>open.has(qid)).map(qid=>doc.questions.find(question=>question.id===qid)?.answer||'').filter(Boolean);$('lessonFreeAnswerBox').hidden=answers.length===0;$('lessonFreeAnswer').textContent=answers.join('\n');
    }else{
      $('lessonOtherHidden').checked=session.otherAnswers==='hidden';$('lessonOtherVisible').checked=session.otherAnswers==='visible';
      const total=session.queue.length,current=session.ended?total:Math.min(session.index+1,total);$('lessonGuidedProgress').textContent=current+' / '+total;const qid=currentGuidedId(),q=qid&&doc.questions.find(item=>item.id===qid),revealed=Boolean(q&&session.stage==='revealed');
      $('lessonPrompt').hidden=!q?.prompt;$('lessonPrompt').textContent=q?.prompt||'';$('lessonAnswerBox').hidden=!revealed;$('lessonAnswer').textContent=revealed?(q?.answer||''):'';
      const awaiting=Boolean(q&&session.stage==='hidden');
      $('lessonRevealCurrent').hidden=!awaiting;
      $('lessonRecalled').hidden=!revealed;
      $('lessonAgain').hidden=!revealed;
      $('lessonRevealCurrent').disabled=!awaiting;
      $('lessonRecalled').disabled=!revealed;
      $('lessonAgain').disabled=!revealed;
      $('lessonSkip').disabled=!q;
      $('lessonPrevious').disabled=session.queue.length===0||(!session.ended&&session.index<=0);
      $('lessonFinish').disabled=session.ended;
      const value=session.ended?total:Math.min(session.index+1,total),maximum=Math.max(1,total);
      $('lessonProgressTrack').setAttribute('aria-valuemax',String(maximum));
      $('lessonProgressTrack').setAttribute('aria-valuenow',String(value));
      $('lessonProgressFill').style.width=(100*value/maximum)+'%';
      const list=$('lessonGuidedList');list.replaceChildren();session.queue.forEach((item,index)=>{const b=env.document.createElement('button');b.type='button';b.className='lesson-question';b.dataset.rating=session.ratings[item.questionId]||'unanswered';b.textContent=(index+1)+' · '+t('rating_'+b.dataset.rating);b.setAttribute('aria-current',String(!session.ended&&index===session.index));b.addEventListener('click',()=>{closeSheet();session=core.goToQuestion(session,item.questionId);syncGuidedPage();scheduleStudySave();render();studyView.render();});list.append(b);});
      const sum=summaryGuided();$('lessonResults').hidden=!session.ended;$('lessonResultTotal').textContent=String(sum.total);$('lessonResultRecalled').textContent=String(sum.recalled);$('lessonResultAgain').textContent=String(sum.again);$('lessonResultSkipped').textContent=String(sum.skipped);$('lessonResultUnanswered').textContent=String(sum.unanswered);$('lessonReviewAgain').hidden=sum.again===0;$('lessonReviewUnchecked').hidden=sum.skipped+sum.unanswered===0;
    }
    studyView?.mount({document:doc,pageId,session,mode:'study',selectedMaskId:null,selectedMaskIds:[]});
  }
  function newSession(nextMode){if(mode===nextMode)return;closeSheet();mode=nextMode;session=core.startSession(doc,{mode:nextMode,...(nextMode==='guided'?{otherAnswers:doc.defaults.otherAnswers}:{})});syncGuidedPage();scheduleStudySave();render();}
  function reveal(){if(session.mode!=='guided')return;session=core.revealCurrent(session,session.epoch);render();studyView.render();}
  function rate(value){const qid=currentGuidedId();if(!qid||session.stage!=='revealed')return;session=core.rate(session,qid,value,session.epoch);syncGuidedPage();scheduleStudySave();render();}
  function skip(){if(session.mode!=='guided'||!currentGuidedId())return;session=core.skip(session,session.epoch);syncGuidedPage();scheduleStudySave();render();}
  function previous(){if(session.mode!=='guided'||!session.queue.length)return;const index=session.ended?session.queue.length-1:Math.max(0,session.index-1);session=core.goToQuestion(session,session.queue[index].questionId);syncGuidedPage();render();}
  function finish(){if(session.mode!=='guided')return;session=core.finishSession(session,session.epoch);scheduleStudySave();render();}
  function review(kind){const next=core.makeReviewSession(doc,session,kind);if(!next)return;session=next;mode='guided';syncGuidedPage();scheduleStudySave();render();}
  function applyLanguage(){
    env.document.documentElement.lang=language;$('lessonTitle').textContent=doc.title;
    $('lessonSubtitle').textContent=t('subtitle');
    for(const [id,key] of [['lessonPrevPage','previousPage'],['lessonNextPage','nextPage'],['lessonPageToggle','openPages'],['lessonSettingsButton','settings'],['lessonQuestionsButton','questions'],['lessonSheetClose','close']]){
      $(id).setAttribute('aria-label',t(key));
    }
    $('lessonSettingsButton').title=t('settings');
    $('lessonQuestionsButton').textContent=t('questions');
    $('lessonFreeMode').setAttribute('aria-label',t('free'));
    $('lessonGuidedMode').setAttribute('aria-label',t('guided'));
    $('lessonPageSwitch').setAttribute('aria-label',t('pagesLabel'));
    if(sheetKind)$('lessonSheetTitle').textContent=t({pages:'pagesLabel',questions:'questions',settings:'settings'}[sheetKind]);
    $('lessonLanguage').textContent=language==='ja'?'EN':'JA';$('lessonLanguage').setAttribute('title',language==='ja'?'英語に切り替え':'Switch to Japanese');$('lessonLanguage').setAttribute('aria-label',language==='ja'?'英語に切り替え':'Switch to Japanese');$('lessonFreeMode').textContent=t('free');$('lessonGuidedMode').textContent=t('guided');$('lessonCheckedLabel').textContent=t('checked');$('lessonHideAll').textContent=t('hideAll');$('lessonRevealPage').textContent=t('revealPage');$('lessonOtherLegend').textContent=t('otherAnswers');$('lessonOtherHiddenText').textContent=t('hideOthers');$('lessonOtherVisibleText').textContent=t('showOthers');$('lessonRevealCurrent').textContent=t('reveal');$('lessonRecalled').textContent=t('recalled');$('lessonAgain').textContent=t('again');$('lessonSkip').textContent=t('skip');$('lessonPrevious').textContent=t('previous');$('lessonFinish').textContent=t('finish');$('lessonResultsTitle').textContent=t('results');$('lessonTotalLabel').textContent=t('total');$('lessonRecalledLabel').textContent=t('recalled');$('lessonAgainLabel').textContent=t('again');$('lessonSkippedLabel').textContent=t('skip');$('lessonUnansweredLabel').textContent=t('unanswered');$('lessonReviewAgain').textContent=t('reviewAgain');$('lessonReviewUnchecked').textContent=t('reviewUnchecked');$('lessonSaveEditableButton').textContent=t('saveEditable');$('lessonFilenameLabel').textContent=t('filenameLabel');$('lessonFreeAnswerLabel').textContent=t('revealedAnswerText');$('lessonHelpButton').setAttribute('aria-label',t('help'));$('lessonHelpTitle').textContent=t('help');$('lessonHelpBody').textContent=t('helpBody');$('lessonHelpClose').textContent=t('close');$('lessonPages').setAttribute('aria-label',t('pagesLabel'));$('maskSvg').setAttribute('aria-label',t('coversLabel'));$('lessonQuestionList').setAttribute('aria-label',t('questionsLabel'));$('lessonGuidedList').setAttribute('aria-label',t('questionsLabel'));$('lessonStudyOptInText').textContent=t('studySave');$('lessonStudyOptInNote').textContent=t('studySaveNote');render();
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
  function keydown(event){if(/INPUT|TEXTAREA|BUTTON/.test(event.target?.tagName)||$('lessonConfirmDialog').open||$('lessonSheet').open||$('lessonHelpDialog').open)return;if(mode==='guided'){if(event.repeat&&[' ','1','2','s','S','ArrowLeft'].includes(event.key)){event.preventDefault();return;}if(event.key===' '){event.preventDefault();reveal();}else if(event.key==='1'&&session.stage==='revealed')rate('recalled');else if(event.key==='2'&&session.stage==='revealed')rate('again');else if(event.key.toLowerCase()==='s')skip();else if(event.key==='ArrowLeft')previous();}}
  async function start(){
    env.document.documentElement.style.setProperty('--cover-color',doc.defaults.coverColor||'#16624f');
    studyView=createStudyView({core,dom:env.document,translate:t,onAction:action=>{if(action.type==='TOGGLE_QUESTION'&&mode==='free'){session=core.toggleFree(session,action.questionId);scheduleStudySave();render();}else if(action.type==='REVEAL_CURRENT'&&mode==='guided'&&action.questionId===currentGuidedId())reveal();}});
    $('lessonFilename').value=doc.title||'reveal-sheet';
    $('lessonFreeMode').addEventListener('click',()=>newSession('free'));$('lessonGuidedMode').addEventListener('click',()=>newSession('guided'));$('lessonHideAll').addEventListener('click',()=>{session=core.hideAllFree(session);render();});$('lessonRevealPage').addEventListener('click',()=>{session=core.revealPageFree(doc,session,pageId);render();});$('lessonRevealCurrent').addEventListener('click',reveal);$('lessonRecalled').addEventListener('click',()=>rate('recalled'));$('lessonAgain').addEventListener('click',()=>rate('again'));$('lessonSkip').addEventListener('click',skip);$('lessonPrevious').addEventListener('click',previous);$('lessonFinish').addEventListener('click',finish);$('lessonReviewAgain').addEventListener('click',()=>review('again'));$('lessonReviewUnchecked').addEventListener('click',()=>review('unchecked'));$('lessonOtherHidden').addEventListener('change',()=>{if(session.mode==='guided'){session={...session,otherAnswers:'hidden'};render();}});$('lessonOtherVisible').addEventListener('change',()=>{if(session.mode==='guided'){session={...session,otherAnswers:'visible'};render();}});
    $('lessonPageToggle').addEventListener('click',event=>openSheet('pages',event.currentTarget));
    $('lessonPrevPage').addEventListener('click',()=>stepPage(-1));
    $('lessonNextPage').addEventListener('click',()=>stepPage(1));
    $('lessonSettingsButton').addEventListener('click',event=>openSheet('settings',event.currentTarget));
    $('lessonQuestionsButton').addEventListener('click',event=>openSheet('questions',event.currentTarget));
    $('lessonSheetClose').addEventListener('click',closeSheet);
    $('lessonSheet').addEventListener('close',restoreSheet);
    $('lessonSheet').addEventListener('click',event=>{
      if(event.target!==$('lessonSheet'))return;
      const bounds=event.currentTarget.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)closeSheet();
    });
    mobileLayout.addEventListener('change',()=>{if(!mobileLayout.matches)closeSheet();});
    $('lessonLanguage').addEventListener('click',()=>{language=language==='ja'?'en':'ja';applyLanguage();});$('lessonHelpButton').addEventListener('click',()=>$('lessonHelpDialog').showModal());$('lessonHelpClose').addEventListener('click',()=>$('lessonHelpDialog').close());$('lessonSaveEditableButton').addEventListener('click',saveEditable);$('lessonStudyOptIn').addEventListener('change',toggleStudy);$('lessonConfirmOk').addEventListener('click',()=>finishConfirm(true));$('lessonConfirmCancel').addEventListener('click',()=>finishConfirm(false));env.document.addEventListener('keydown',keydown);
    applyLanguage();renderPages();await showPage(pageId);$('lessonWaiting').hidden=true;$('lessonReady').hidden=false;env.document.body.classList.add('lesson-active');await initPersistence();
  }
  function destroy(){closeSheet();if(saveTimer)env.clearTimeout(saveTimer);studyView?.destroy();}
  return Object.freeze({start,destroy});
}
