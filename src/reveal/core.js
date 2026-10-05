/** Pure Reveal Sheet document and free-study primitives. Browser APIs are injected elsewhere. */
function createRevealCore() {
  const limits = Object.freeze({
    maxPages: 30, maxMasks: 1000, maxMasksPerPage: 200, maxQuestions: 1000,
    maxQuestionMasks: 50, maxInputBytes: 20 * 1024 ** 2,
    maxSide: 8192, maxPixels: 16000000, maxPngBytes: 32 * 1024 ** 2,
    maxAssetBytes: 64 * 1024 ** 2, maxJsonBytes: 96 * 1024 ** 2,
    maxHtmlBytes: 100 * 1024 ** 2, maxUndo: 100
  });
  function error(code) { const value = new Error(code); value.code = code; return value; }
  function newDocument(ctx, title = 'Untitled sheet') {
    return { id: ctx.newId('document'), revision: 1, title,
      defaults: { mode: 'free', otherAnswers: 'hidden' },
      pages: [], assets: [], questions: [], masks: [] };
  }
  function appendAsset(doc, asset, ctx, title) {
    const total = doc.assets.reduce((sum, item) => sum + item.byteLength, 0);
    if (doc.pages.length >= limits.maxPages || total + asset.byteLength > limits.maxAssetBytes)
      throw error('LIMIT_EXCEEDED');
    if (doc.assets.some(item => item.id === asset.id) || asset.mime !== 'image/png' ||
        !Number.isSafeInteger(asset.byteLength) || asset.byteLength < 1 || asset.byteLength > limits.maxPngBytes)
      throw error('INVALID_SHEET');
    const normalized = {id:asset.id, mime:asset.mime, width:asset.width, height:asset.height,
      byteLength:asset.byteLength, dataBase64:asset.dataBase64};
    return { ...doc, revision: doc.revision + 1,
      pages: [...doc.pages, {id:ctx.newId('page'), title, description:'', imageId:asset.id, questionOrder:[]}],
      assets: [...doc.assets, normalized] };
  }
  const round6 = value => Math.round(value * 1e6) / 1e6;
  function pageAsset(doc,pageId) {
    const page=doc.pages.find(item=>item.id===pageId); if(!page)throw error('INVALID_SHEET');
    const asset=doc.assets.find(item=>item.id===page.imageId); if(!asset)throw error('INVALID_SHEET');
    return {page,asset};
  }
  function normalizeRect(rect, asset) {
    if(!rect || !asset)throw error('INVALID_SHEET');
    const out={x:round6(Number(rect.x)),y:round6(Number(rect.y)),w:round6(Number(rect.w)),h:round6(Number(rect.h))};
    if(!Object.values(out).every(Number.isFinite) || out.x<0 || out.y<0 || out.w<=0 || out.h<=0 || out.x+out.w>1 || out.y+out.h>1)
      throw error('INVALID_SHEET');
    if(out.w*asset.width<1-1e-9 || out.h*asset.height<1-1e-9)throw error('INVALID_SHEET');
    return out;
  }
  function rectToPixels(rect,width,height) {
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw error('INVALID_SHEET');
    return {x:rect.x*width,y:rect.y*height,w:rect.w*width,h:rect.h*height};
  }
  function mutation(document,{affectedQuestionIds=[],deletedQuestionIds=[],addedQuestionIds=[]}={}) {
    return {document,affectedQuestionIds,deletedQuestionIds,addedQuestionIds};
  }
  function applyCommand(doc,command,ctx) {
    if(!command || typeof command.type!=='string')throw error('INVALID_SHEET');
    if(command.type==='ADD_ANSWER_MASK') {
      const {page,asset}=pageAsset(doc,command.pageId);
      if(doc.masks.length>=limits.maxMasks || doc.questions.length>=limits.maxQuestions || doc.masks.filter(x=>x.pageId===page.id).length>=limits.maxMasksPerPage)
        throw error('LIMIT_EXCEEDED');
      const rect=normalizeRect(command.rect,asset), qid=ctx.newId('question'), mid=ctx.newId('mask');
      const question={id:qid,pageId:page.id,revision:1,maskIds:[mid],prompt:'',answer:''};
      const mask={id:mid,pageId:page.id,kind:'answer',questionId:qid,rect};
      const pages=doc.pages.map(item=>item.id===page.id?{...item,questionOrder:[...item.questionOrder,qid]}:item);
      return mutation({...doc,revision:doc.revision+1,pages,questions:[...doc.questions,question],masks:[...doc.masks,mask]}, {affectedQuestionIds:[qid],addedQuestionIds:[qid]});
    }
    if(command.type==='SET_MASK_RECT') {
      const mask=doc.masks.find(item=>item.id===command.maskId); if(!mask)throw error('INVALID_SHEET');
      const {asset}=pageAsset(doc,mask.pageId); const rect=normalizeRect(command.rect,asset);
      const masks=doc.masks.map(item=>item.id===mask.id?{...item,rect}:item);
      let questions=doc.questions, affected=[];
      if(mask.kind==='answer') {
        const q=doc.questions.find(item=>item.id===mask.questionId); if(!q)throw error('INVALID_SHEET');
        questions=doc.questions.map(item=>item.id===q.id?{...item,revision:item.revision+1}:item); affected=[q.id];
      } else affected=doc.questions.filter(q=>q.pageId===mask.pageId).map(q=>q.id);
      return mutation({...doc,revision:doc.revision+1,masks,questions},{affectedQuestionIds:affected});
    }
    if(command.type==='DELETE_MASK') {
      const mask=doc.masks.find(item=>item.id===command.maskId); if(!mask)throw error('INVALID_SHEET');
      let questions=doc.questions,pages=doc.pages,deleted=[],affected=[];
      if(mask.kind==='answer') {
        const q=doc.questions.find(item=>item.id===mask.questionId); if(!q)throw error('INVALID_SHEET');
        const remaining=q.maskIds.filter(id=>id!==mask.id);
        if(!remaining.length){questions=questions.filter(item=>item.id!==q.id);pages=pages.map(p=>p.id===q.pageId?{...p,questionOrder:p.questionOrder.filter(id=>id!==q.id)}:p);deleted=[q.id];}
        else {questions=questions.map(item=>item.id===q.id?{...item,maskIds:remaining,revision:item.revision+1}:item);affected=[q.id];}
      } else affected=doc.questions.filter(q=>q.pageId===mask.pageId).map(q=>q.id);
      return mutation({...doc,revision:doc.revision+1,pages,questions,masks:doc.masks.filter(item=>item.id!==mask.id)},{affectedQuestionIds:affected,deletedQuestionIds:deleted});
    }
    if(command.type==='GROUP_QUESTIONS') {
      const ids=[...new Set(Array.isArray(command.questionIds)?command.questionIds:[])];if(ids.length<2)throw error('INVALID_SHEET');
      const selected=ids.map(id=>doc.questions.find(question=>question.id===id));if(selected.some(question=>!question))throw error('INVALID_SHEET');
      const pageId=selected[0].pageId;if(selected.some(question=>question.pageId!==pageId))throw error('INVALID_SHEET');
      const page=doc.pages.find(item=>item.id===pageId);if(!page)throw error('INVALID_SHEET');
      const selectedSet=new Set(ids),ordered=page.questionOrder.filter(id=>selectedSet.has(id)).map(id=>doc.questions.find(question=>question.id===id));
      if(ordered.length!==ids.length)throw error('INVALID_SHEET');
      const maskIds=ordered.flatMap(question=>question.maskIds);if(maskIds.length>limits.maxQuestionMasks)throw error('LIMIT_EXCEEDED');
      function mergedText(key){const values=[];for(const question of ordered){const value=question[key];if(value&&!values.includes(value))values.push(value);}const text=values.join('\n');if(codePoints(text)>2000)throw error('LIMIT_EXCEEDED');return text;}
      const survivor=ordered[0],removed=new Set(ordered.slice(1).map(question=>question.id));
      const merged={...survivor,revision:survivor.revision+1,maskIds,prompt:mergedText('prompt'),answer:mergedText('answer')};
      const questions=doc.questions.filter(question=>!removed.has(question.id)).map(question=>question.id===survivor.id?merged:question);
      const masks=doc.masks.map(mask=>maskIds.includes(mask.id)?{...mask,questionId:survivor.id}:mask);
      const pages=doc.pages.map(item=>item.id===pageId?{...item,questionOrder:item.questionOrder.filter(id=>!removed.has(id))}:item);
      return mutation({...doc,revision:doc.revision+1,pages,questions,masks},{affectedQuestionIds:[survivor.id],deletedQuestionIds:[...removed]});
    }
    if(command.type==='UNGROUP_QUESTION') {
      const question=doc.questions.find(item=>item.id===command.questionId);if(!question||question.maskIds.length<2)throw error('INVALID_SHEET');
      const page=doc.pages.find(item=>item.id===question.pageId);if(!page)throw error('INVALID_SHEET');
      const newQuestions=[],addedIds=[];
      question.maskIds.forEach((maskId,index)=>{if(index===0)newQuestions.push({...question,revision:question.revision+1,maskIds:[maskId]});else{const id=ctx.newId('question');addedIds.push(id);newQuestions.push({id,pageId:question.pageId,revision:1,maskIds:[maskId],prompt:question.prompt,answer:question.answer});}});
      const replacementIds=newQuestions.map(item=>item.id),questions=doc.questions.flatMap(item=>item.id===question.id?newQuestions:[item]);
      const masks=doc.masks.map(mask=>{const index=question.maskIds.indexOf(mask.id);return index>=0?{...mask,questionId:replacementIds[index]}:mask;});
      const pages=doc.pages.map(item=>item.id===page.id?{...item,questionOrder:item.questionOrder.flatMap(id=>id===question.id?replacementIds:[id])}:item);
      return mutation({...doc,revision:doc.revision+1,pages,questions,masks},{affectedQuestionIds:replacementIds,addedQuestionIds:addedIds});
    }
    if(command.type==='CONVERT_MASK_KIND') {
      const mask=doc.masks.find(item=>item.id===command.maskId);if(!mask||!['answer','auxiliary'].includes(command.kind))throw error('INVALID_SHEET');
      if(mask.kind===command.kind)return mutation(doc);
      if(command.kind==='auxiliary'){
        const question=doc.questions.find(item=>item.id===mask.questionId);if(!question)throw error('INVALID_SHEET');
        const remaining=question.maskIds.filter(id=>id!==mask.id);let questions,pages=doc.pages,deleted=[];
        if(remaining.length){questions=doc.questions.map(item=>item.id===question.id?{...item,revision:item.revision+1,maskIds:remaining}:item);}
        else{questions=doc.questions.filter(item=>item.id!==question.id);pages=doc.pages.map(page=>page.id===question.pageId?{...page,questionOrder:page.questionOrder.filter(id=>id!==question.id)}:page);deleted=[question.id];}
        const masks=doc.masks.map(item=>item.id===mask.id?{...item,kind:'auxiliary',questionId:null}:item);
        return mutation({...doc,revision:doc.revision+1,pages,questions,masks},{affectedQuestionIds:remaining.length?[question.id]:[],deletedQuestionIds:deleted});
      }
      if(doc.questions.length>=limits.maxQuestions)throw error('LIMIT_EXCEEDED');
      const qid=ctx.newId('question'),question={id:qid,pageId:mask.pageId,revision:1,maskIds:[mask.id],prompt:'',answer:''};
      const masks=doc.masks.map(item=>item.id===mask.id?{...item,kind:'answer',questionId:qid}:item);
      const pages=doc.pages.map(page=>page.id===mask.pageId?{...page,questionOrder:[...page.questionOrder,qid]}:page);
      return mutation({...doc,revision:doc.revision+1,pages,questions:[...doc.questions,question],masks},{affectedQuestionIds:[qid],addedQuestionIds:[qid]});
    }
    if(command.type==='DUPLICATE_SELECTION') {
      const requested=[...new Set(Array.isArray(command.maskIds)?command.maskIds:[])];if(!requested.length)throw error('INVALID_SHEET');
      const chosen=requested.map(id=>doc.masks.find(mask=>mask.id===id));if(chosen.some(mask=>!mask))throw error('INVALID_SHEET');
      const selectedQuestionIds=new Set(chosen.filter(mask=>mask.kind==='answer').map(mask=>mask.questionId));
      const selectedAux=chosen.filter(mask=>mask.kind==='auxiliary');
      const selectedQuestions=doc.pages.flatMap(page=>page.questionOrder.filter(id=>selectedQuestionIds.has(id)).map(id=>doc.questions.find(question=>question.id===id)));
      const duplicateMaskCount=selectedQuestions.reduce((sum,question)=>sum+question.maskIds.length,0)+selectedAux.length;
      if(doc.masks.length+duplicateMaskCount>limits.maxMasks||doc.questions.length+selectedQuestions.length>limits.maxQuestions)throw error('LIMIT_EXCEEDED');
      const extraPerPage=new Map();
      for(const question of selectedQuestions)extraPerPage.set(question.pageId,(extraPerPage.get(question.pageId)||0)+question.maskIds.length);
      for(const mask of selectedAux)extraPerPage.set(mask.pageId,(extraPerPage.get(mask.pageId)||0)+1);
      for(const [pageId,extra] of extraPerPage){if(doc.masks.filter(mask=>mask.pageId===pageId).length+extra>limits.maxMasksPerPage)throw error('LIMIT_EXCEEDED');}
      const newMasks=[],newQuestions=[],duplicateQuestionByOriginal=new Map();
      function offsetMask(source,newId,questionId,kind){
        const {asset}=pageAsset(doc,source.pageId),dx=10/asset.width,dy=10/asset.height;
        const rect=normalizeRect({x:Math.min(1-source.rect.w,source.rect.x+dx),y:Math.min(1-source.rect.h,source.rect.y+dy),w:source.rect.w,h:source.rect.h},asset);
        return {id:newId,pageId:source.pageId,kind,questionId,rect};
      }
      for(const question of selectedQuestions){
        const qid=ctx.newId('question'),maskIds=[];
        for(const sourceId of question.maskIds){const source=doc.masks.find(mask=>mask.id===sourceId),mid=ctx.newId('mask');maskIds.push(mid);newMasks.push(offsetMask(source,mid,qid,'answer'));}
        duplicateQuestionByOriginal.set(question.id,qid);newQuestions.push({id:qid,pageId:question.pageId,revision:1,maskIds,prompt:question.prompt,answer:question.answer});
      }
      for(const source of selectedAux){const mid=ctx.newId('mask');newMasks.push(offsetMask(source,mid,null,'auxiliary'));}
      const pages=doc.pages.map(page=>({...page,questionOrder:page.questionOrder.flatMap(id=>duplicateQuestionByOriginal.has(id)?[id,duplicateQuestionByOriginal.get(id)]:[id])}));
      return mutation({...doc,revision:doc.revision+1,pages,questions:[...doc.questions,...newQuestions],masks:[...doc.masks,...newMasks]},{addedQuestionIds:newQuestions.map(question=>question.id),affectedQuestionIds:newQuestions.map(question=>question.id)});
    }
    if(command.type==='RENAME_PAGE') {
      const page=doc.pages.find(item=>item.id===command.pageId);if(!page||!validText(command.title,120))throw error('INVALID_SHEET');
      const pages=doc.pages.map(item=>item.id===page.id?{...item,title:command.title}:item);
      return mutation({...doc,revision:doc.revision+1,pages});
    }
    if(command.type==='MOVE_PAGE') {
      const index=doc.pages.findIndex(item=>item.id===command.pageId),delta=Number(command.delta);
      if(index<0||!Number.isInteger(delta)||![-1,1].includes(delta))throw error('INVALID_SHEET');
      const target=index+delta;if(target<0||target>=doc.pages.length)return mutation(doc);
      const pages=[...doc.pages],[page]=pages.splice(index,1);pages.splice(target,0,page);
      return mutation({...doc,revision:doc.revision+1,pages});
    }
    if(command.type==='DELETE_PAGE') {
      const page=doc.pages.find(item=>item.id===command.pageId);if(!page)throw error('INVALID_SHEET');
      const deletedQuestionIds=doc.questions.filter(question=>question.pageId===page.id).map(question=>question.id);
      const pages=doc.pages.filter(item=>item.id!==page.id);
      const questions=doc.questions.filter(question=>question.pageId!==page.id);
      const masks=doc.masks.filter(mask=>mask.pageId!==page.id);
      const stillReferenced=new Set(pages.map(item=>item.imageId));
      const assets=doc.assets.filter(asset=>asset.id!==page.imageId||stillReferenced.has(asset.id));
      return mutation({...doc,revision:doc.revision+1,pages,assets,questions,masks},{deletedQuestionIds});
    }
    if(command.type==='DUPLICATE_MASK') {
      const source=doc.masks.find(item=>item.id===command.maskId); if(!source || source.kind!=='answer')throw error('INVALID_SHEET');
      const {asset}=pageAsset(doc,source.pageId),px=1/asset.width,py=1/asset.height;
      const rect=normalizeRect({x:Math.min(1-source.rect.w,source.rect.x+10*px),y:Math.min(1-source.rect.h,source.rect.y+10*py),w:source.rect.w,h:source.rect.h},asset);
      return applyCommand(doc,{type:'ADD_ANSWER_MASK',pageId:source.pageId,rect},ctx);
    }
    throw error('INVALID_SHEET');
  }
  function orderedQuestionIds(doc) { return doc.pages.flatMap(page=>page.questionOrder.filter(id=>doc.questions.some(q=>q.id===id))); }
  function startSession(doc,options={}) {
    if((options.mode||'free')!=='free')throw error('INVALID_SHEET');
    return {mode:'free',queue:orderedQuestionIds(doc),openQuestionIds:[],confirmedQuestionIds:[]};
  }
  function toggleFree(session,qid) {
    if(session.mode!=='free'||!session.queue.includes(qid))throw error('INVALID_SHEET');
    const open=new Set(session.openQuestionIds),confirmed=new Set(session.confirmedQuestionIds);
    if(open.has(qid))open.delete(qid);else{open.add(qid);confirmed.add(qid);}
    return {...session,openQuestionIds:[...open],confirmedQuestionIds:[...confirmed]};
  }
  function hideAllFree(session){return {...session,openQuestionIds:[]};}
  function revealPageFree(doc,session,pageId){
    const page=doc.pages.find(p=>p.id===pageId);if(!page)throw error('INVALID_SHEET');
    let next=session;for(const qid of page.questionOrder)if(!next.openQuestionIds.includes(qid))next=toggleFree(next,qid);return next;
  }
  function summaryFree(session){const valid=new Set(session.queue);return {total:session.queue.length,confirmed:session.confirmedQuestionIds.filter(id=>valid.has(id)).length};}
  function visibilityFor(doc,session){
    const open=new Set(session?.openQuestionIds||[]), result=new Map();
    for(const mask of doc.masks)result.set(mask.id,mask.kind==='auxiliary'||!open.has(mask.questionId));
    return result;
  }

  function isPlainObject(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value)&&Object.prototype.toString.call(value)==='[object Object]';}
  function exactKeys(value,keys){if(!isPlainObject(value))return false;const actual=Object.keys(value).sort(),expected=[...keys].sort();return actual.length===expected.length&&actual.every((key,index)=>key===expected[index]);}
  function validId(value){return typeof value==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(value);}
  function codePoints(value){return [...value].length;}
  function utf8Length(value){let length=0;for(const ch of value){const cp=ch.codePointAt(0);length+=cp<=0x7f?1:cp<=0x7ff?2:cp<=0xffff?3:4;}return length;}
  function validText(value,max){return typeof value==='string'&&!value.includes('\0')&&codePoints(value)<=max;}
  function validPositiveInt(value){return Number.isSafeInteger(value)&&value>=1;}
  function decodedBase64Length(value){
    if(typeof value!=='string'||value.length===0||value.length%4!==0||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))return -1;
    let padding=0;if(value.endsWith('=='))padding=2;else if(value.endsWith('='))padding=1;
    return value.length/4*3-padding;
  }
  function validStoredRect(rect,asset){
    if(!exactKeys(rect,['x','y','w','h']))return false;
    const values=[rect.x,rect.y,rect.w,rect.h];
    if(!values.every(Number.isFinite)||values.some(value=>Math.abs(round6(value)-value)>1e-12))return false;
    if(rect.x<0||rect.y<0||rect.w<=0||rect.h<=0||rect.x+rect.w>1||rect.y+rect.h>1)return false;
    return rect.w*asset.width>=1-1e-9&&rect.h*asset.height>=1-1e-9;
  }
  function validateEnvelope(value){
    const errors=[];const fail=(path,code='INVALID_SHEET')=>{errors.push({code,path});return {ok:false,errors};};
    if(!exactKeys(value,['format','schemaVersion','appVersion','kind','document']))return fail('$.envelope');
    if(value.format!=='reveal-sheet')return fail('$.format');
    if(value.schemaVersion!==1)return fail('$.schemaVersion','UNSUPPORTED_SCHEMA');
    if(typeof value.appVersion!=='string'||!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value.appVersion))return fail('$.appVersion');
    if(value.kind!=='editable'&&value.kind!=='lesson')return fail('$.kind');
    const doc=value.document;
    if(!exactKeys(doc,['id','revision','title','defaults','pages','assets','questions','masks']))return fail('$.document');
    if(!validId(doc.id)||!validPositiveInt(doc.revision)||!validText(doc.title,120))return fail('$.document.identity');
    if(!exactKeys(doc.defaults,['mode','otherAnswers'])||!['free','guided'].includes(doc.defaults.mode)||!['hidden','visible'].includes(doc.defaults.otherAnswers))return fail('$.document.defaults');
    if(!Array.isArray(doc.pages)||doc.pages.length<1||doc.pages.length>limits.maxPages)return fail('$.document.pages');
    if(!Array.isArray(doc.assets)||doc.assets.length<1)return fail('$.document.assets');
    if(!Array.isArray(doc.questions)||doc.questions.length>limits.maxQuestions)return fail('$.document.questions');
    if(!Array.isArray(doc.masks)||doc.masks.length>limits.maxMasks)return fail('$.document.masks');
    if(value.kind==='lesson'&&doc.questions.length<1)return fail('$.document.questions');

    const assets=new Map(),pages=new Map(),questions=new Map(),masks=new Map();
    let totalAssetBytes=0,totalTextBytes=utf8Length(doc.title);

    for(let index=0;index<doc.assets.length;index++){
      const asset=doc.assets[index],path='$.document.assets['+index+']';
      if(!exactKeys(asset,['id','mime','width','height','byteLength','dataBase64']))return fail(path);
      if(!validId(asset.id)||assets.has(asset.id)||asset.mime!=='image/png')return fail(path);
      if(!Number.isSafeInteger(asset.width)||!Number.isSafeInteger(asset.height)||asset.width<1||asset.height<1||asset.width>limits.maxSide||asset.height>limits.maxSide||asset.width*asset.height>limits.maxPixels)return fail(path);
      if(!Number.isSafeInteger(asset.byteLength)||asset.byteLength<1||asset.byteLength>limits.maxPngBytes)return fail(path);
      if(decodedBase64Length(asset.dataBase64)!==asset.byteLength||!asset.dataBase64.startsWith('iVBORw0KGgo'))return fail(path+'.dataBase64');
      totalAssetBytes+=asset.byteLength;if(totalAssetBytes>limits.maxAssetBytes)return fail('$.document.assets','LIMIT_EXCEEDED');
      assets.set(asset.id,asset);
    }
    for(let index=0;index<doc.pages.length;index++){
      const page=doc.pages[index],path='$.document.pages['+index+']';
      if(!exactKeys(page,['id','title','description','imageId','questionOrder']))return fail(path);
      if(!validId(page.id)||pages.has(page.id)||!validText(page.title,120)||!validText(page.description,2000)||!validId(page.imageId)||!assets.has(page.imageId))return fail(path);
      if(!Array.isArray(page.questionOrder)||page.questionOrder.some(id=>!validId(id))||new Set(page.questionOrder).size!==page.questionOrder.length)return fail(path+'.questionOrder');
      totalTextBytes+=utf8Length(page.title)+utf8Length(page.description);pages.set(page.id,page);
    }
    if(totalTextBytes>1024*1024)return fail('$.document','LIMIT_EXCEEDED');
    const referencedAssets=new Set(doc.pages.map(page=>page.imageId));if(referencedAssets.size!==assets.size)return fail('$.document.assets');

    for(let index=0;index<doc.questions.length;index++){
      const question=doc.questions[index],path='$.document.questions['+index+']';
      if(!exactKeys(question,['id','pageId','revision','maskIds','prompt','answer']))return fail(path);
      if(!validId(question.id)||questions.has(question.id)||!validId(question.pageId)||!pages.has(question.pageId)||!validPositiveInt(question.revision))return fail(path);
      if(!Array.isArray(question.maskIds)||question.maskIds.length<1||question.maskIds.length>limits.maxQuestionMasks||question.maskIds.some(id=>!validId(id))||new Set(question.maskIds).size!==question.maskIds.length)return fail(path+'.maskIds');
      if(!validText(question.prompt,2000)||!validText(question.answer,2000))return fail(path);
      totalTextBytes+=utf8Length(question.prompt)+utf8Length(question.answer);questions.set(question.id,question);
    }
    if(totalTextBytes>1024*1024)return fail('$.document','LIMIT_EXCEEDED');

    const masksPerPage=new Map();
    for(let index=0;index<doc.masks.length;index++){
      const mask=doc.masks[index],path='$.document.masks['+index+']';
      if(!exactKeys(mask,['id','pageId','kind','questionId','rect']))return fail(path);
      if(!validId(mask.id)||masks.has(mask.id)||!validId(mask.pageId)||!pages.has(mask.pageId)||!['answer','auxiliary'].includes(mask.kind))return fail(path);
      if(mask.kind==='answer'&&!validId(mask.questionId))return fail(path+'.questionId');
      if(mask.kind==='auxiliary'&&mask.questionId!==null)return fail(path+'.questionId');
      const page=pages.get(mask.pageId),asset=assets.get(page.imageId);if(!validStoredRect(mask.rect,asset))return fail(path+'.rect');
      const count=(masksPerPage.get(mask.pageId)||0)+1;if(count>limits.maxMasksPerPage)return fail(path,'LIMIT_EXCEEDED');masksPerPage.set(mask.pageId,count);
      masks.set(mask.id,mask);
    }

    const referencedAnswerMasks=new Set();
    for(const question of questions.values()){
      const page=pages.get(question.pageId);
      for(const maskId of question.maskIds){
        const mask=masks.get(maskId);
        if(!mask||mask.kind!=='answer'||mask.pageId!==question.pageId||mask.questionId!==question.id||referencedAnswerMasks.has(maskId))return fail('$.document.questions');
        referencedAnswerMasks.add(maskId);
      }
      const expected=doc.questions.filter(item=>item.pageId===page.id).map(item=>item.id);
      if(page.questionOrder.length!==expected.length||new Set(page.questionOrder).size!==expected.length||page.questionOrder.some(id=>!questions.has(id)||questions.get(id).pageId!==page.id)||expected.some(id=>!page.questionOrder.includes(id)))return fail('$.document.pages.questionOrder');
    }
    for(const mask of masks.values())if(mask.kind==='answer'&&!referencedAnswerMasks.has(mask.id))return fail('$.document.masks');
    return {ok:true};
  }

  function createHistory(limit=limits.maxUndo){
    const normalized=Number.isSafeInteger(limit)&&limit>0?Math.min(limit,limits.maxUndo):limits.maxUndo;
    return {limit:normalized,undo:[],redo:[]};
  }
  function boundedPush(list,value,limit){const next=[...list,value];if(next.length>limit)next.splice(0,next.length-limit);return next;}
  function monotonicRestore(target,current){
    const revisions=new Map(current.questions.map(question=>[question.id,question.revision]));
    return {...target,revision:current.revision+1,questions:target.questions.map(question=>({...question,revision:Math.max(question.revision,revisions.get(question.id)||question.revision)}))};
  }
  function execute(history,doc,command,ctx){
    const mutationResult=applyCommand(doc,command,ctx);
    if(mutationResult.document===doc)return {history,mutation:mutationResult};
    return {history:{limit:history.limit,undo:boundedPush(history.undo,doc,history.limit),redo:[]},mutation:mutationResult};
  }
  function undo(history,doc){
    if(!history.undo.length)return {history,mutation:mutation(doc)};
    const target=history.undo[history.undo.length-1],restored=monotonicRestore(target,doc);
    return {history:{limit:history.limit,undo:history.undo.slice(0,-1),redo:boundedPush(history.redo,doc,history.limit)},mutation:mutation(restored)};
  }
  function redo(history,doc){
    if(!history.redo.length)return {history,mutation:mutation(doc)};
    const target=history.redo[history.redo.length-1],restored=monotonicRestore(target,doc);
    return {history:{limit:history.limit,undo:boundedPush(history.undo,doc,history.limit),redo:history.redo.slice(0,-1)},mutation:mutation(restored)};
  }

  function counts(doc){return {pages:doc.pages.length,masks:doc.masks.length,questions:doc.questions.length,auxiliary:doc.masks.filter(mask=>mask.kind==='auxiliary').length};}
  function overlapWarnings(doc,pageId){
    const pageMasks=doc.masks.filter(mask=>mask.pageId===pageId),warnings=[];
    const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
    for(let left=0;left<pageMasks.length;left++)for(let right=left+1;right<pageMasks.length;right++){
      const a=pageMasks[left],b=pageMasks[right];
      if(!overlaps(a.rect,b.rect))continue;
      if(a.kind==='answer'&&b.kind==='answer'&&a.questionId===b.questionId)continue;
      warnings.push({code:'OVERLAP',maskIds:[a.id,b.id]});
    }
    return warnings;
  }

  return Object.freeze({limits,error,newDocument,appendAsset,normalizeRect,rectToPixels,applyCommand,createHistory,execute,undo,redo,counts,overlapWarnings,startSession,toggleFree,hideAllFree,revealPageFree,summaryFree,visibilityFor,validateEnvelope});
}
