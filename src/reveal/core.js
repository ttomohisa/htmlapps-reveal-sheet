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
  return Object.freeze({limits,error,newDocument,appendAsset,normalizeRect,rectToPixels,applyCommand,startSession,toggleFree,hideAllFree,revealPageFree,summaryFree,visibilityFor});
}
