/** Shared image-overlay renderer and per-page view state for editing and study. */
function createStudyView({core,dom,onAction,translate=key=>key,pointerActions=true,onViewResize}) {
  const svg=dom.getElementById('maskSvg'),image=dom.getElementById('previewImage'),surface=image.closest('.preview-surface,.lesson-preview');
  const viewStates=new Map();
  const compactScreen=dom.defaultView?.matchMedia?.('(max-width:767px), (pointer:coarse) and (max-height:520px)');
  let readingFrame=null,questionMarkers=[];

  let state={document:null,pageId:null,session:null,mode:'edit',selectedMaskId:null,selectedMaskIds:[]};
  let lastSurfaceBox=null,viewGeometry=null,viewFrame=null;
  const defaultView=()=>({zoom:1,centerX:.5,centerY:.5});
  function normalizeView(value){
    const zoom=Math.max(.5,Math.min(16,Number(value?.zoom)||1)),half=Math.min(.5,.5/zoom);
    const clamp=value=>Math.max(half,Math.min(1-half,Number.isFinite(Number(value))?Number(value):.5));
    return {zoom:Math.round(zoom*1e6)/1e6,centerX:Math.round(clamp(value?.centerX)*1e6)/1e6,centerY:Math.round(clamp(value?.centerY)*1e6)/1e6};
  }
  function getViewState(pageId=state.pageId){return {...(readingFrame?.pageId===pageId?readingFrame.view:viewStates.get(pageId)||defaultView())};}
  function getViewGeometry(){
    const page=state.document?.pages.find(item=>item.id===state.pageId),asset=page&&state.document.assets.find(item=>item.id===page.imageId);
    if(!surface||!asset)return null;
    // CSS transforms affect getBoundingClientRect(). Measure the untransformed
    // viewport, then fit the image exactly as object-fit / SVG xMidYMid meet do.
    const bounds=surface.getBoundingClientRect(),width=surface.clientWidth,height=surface.clientHeight;
    if(!(width>0&&height>0))return null;
    const fit=Math.min(width/asset.width,height/asset.height);
    const left=bounds.left+(surface.clientLeft||0),top=bounds.top+(surface.clientTop||0);
    viewGeometry={left,top,width,height,centerX:left+width/2,centerY:top+height/2,fitWidth:asset.width*fit,fitHeight:asset.height*fit};
    return {...viewGeometry};
  }
  function applyView(){
    if(!state.pageId)return;
    const geometry=viewGeometry||getViewGeometry();if(!geometry)return;
    const view=getViewState(state.pageId),tx=(.5-view.centerX)*geometry.fitWidth*view.zoom,ty=(.5-view.centerY)*geometry.fitHeight*view.zoom,transform=`translate(${tx}px, ${ty}px) scale(${view.zoom})`;
    image.style.transformOrigin='50% 50%';svg.style.transformOrigin='50% 50%';image.style.transform=transform;svg.style.transform=transform;
    for(const marker of questionMarkers){
      const unitsPerPixel=marker.imageWidth/(geometry.fitWidth*view.zoom);
      const size=Math.min(24*unitsPerPixel,marker.width*.7,marker.height*.85);
      marker.node.setAttribute('transform',`translate(${marker.x} ${marker.y}) scale(${size/24})`);
    }
    svg.dataset.viewZoom=String(view.zoom);svg.dataset.viewCenterX=String(view.centerX);svg.dataset.viewCenterY=String(view.centerY);
  }
  function cancelViewFrame(){if(viewFrame!==null){dom.defaultView?.cancelAnimationFrame?.(viewFrame);viewFrame=null;}}
  function flushView(){cancelViewFrame();applyView();}
  function setViewState(pageId,value,{defer=false}={}){
    if(!pageId)return defaultView();const view=normalizeView(value);
    if(readingFrame?.pageId===pageId){readingFrame.view=view;readingFrame.manual=true;}
    else viewStates.set(pageId,view);
    if(pageId===state.pageId){
      if(defer&&typeof dom.defaultView?.requestAnimationFrame==='function'){
        if(viewFrame===null)viewFrame=dom.defaultView.requestAnimationFrame(()=>{viewFrame=null;applyView();});
      }else flushView();
    }
    return {...view};
  }
  // Frame all covers of one question together, leaving the surrounding notes in view.
  function questionFrame(question,geometry){
    const masks=state.document.masks.filter(mask=>mask.questionId===question.id&&mask.kind==='answer');
    if(!masks.length)return defaultView();
    const left=Math.min(...masks.map(m=>m.rect.x)),right=Math.max(...masks.map(m=>m.rect.x+m.rect.w));
    const top=Math.min(...masks.map(m=>m.rect.y)),bottom=Math.max(...masks.map(m=>m.rect.y+m.rect.h));
    const zoom=Math.max(1,Math.min(2.2,geometry.width*.44/((right-left)*geometry.fitWidth),
      geometry.height*.56/((bottom-top)*geometry.fitHeight)));
    function center(start,end,viewport,imageSize){
      const half=Math.min(.5,viewport/(2*imageSize*zoom));
      const midpoint=(start+end)/2;
      const room=Math.max(0,half*.85-(end-start)/2);
      const withContext=Math.max(midpoint-room,Math.min(midpoint+room,.5));
      return Math.max(half,Math.min(1-half,withContext));
    }
    return normalizeView({zoom,centerX:center(left,right,geometry.width,geometry.fitWidth),
      centerY:center(top,bottom,geometry.height,geometry.fitHeight)});
  }
  function rememberSurfaceBox(){
    const geometry=getViewGeometry();if(!geometry)return;
    const next={width:geometry.width,height:geometry.height};
    const resized=lastSurfaceBox&&(next.width!==lastSurfaceBox.width||next.height!==lastSurfaceBox.height);
    const session=state.session;
    const id=compactScreen?.matches&&state.mode==='study'&&session?.mode==='guided'&&!session.ended
      ?session.queue[session.index]?.questionId:null;
    const question=id&&state.document.questions.find(q=>q.id===id&&q.pageId===state.pageId);
    if(!question)readingFrame=null;
    else if(readingFrame?.questionId!==id||readingFrame.pageId!==state.pageId||(resized&&!readingFrame.manual)){
      readingFrame={pageId:state.pageId,questionId:id,view:questionFrame(question,geometry),manual:false};
    }
    lastSurfaceBox=next;flushView();
  }
  const ResizeObserverCtor=dom.defaultView?.ResizeObserver;
  const resizeObserver=surface&&typeof ResizeObserverCtor==='function'?new ResizeObserverCtor(()=>{rememberSurfaceBox();onViewResize?.();}):null;
  resizeObserver?.observe(surface);
  function svgNode(name){return dom.createElementNS('http://www.w3.org/2000/svg',name);}
  function addInlineAction(mask,kind,x,y,size){
    const group=svgNode('g');group.classList.add('mask-inline-action',kind);group.dataset.maskId=mask.id;group.dataset.maskAction=kind;group.setAttribute('tabindex','0');group.setAttribute('focusable','true');group.setAttribute('role','button');group.setAttribute('aria-label',translate(kind==='duplicate'?'duplicateCover':'deleteCover'));
    const hit=svgNode('rect');hit.classList.add('mask-inline-action-hit');hit.setAttribute('x',String(x));hit.setAttribute('y',String(y));hit.setAttribute('width',String(size));hit.setAttribute('height',String(size));group.append(hit);
    const icon=svgNode('path');icon.classList.add('mask-inline-action-icon');icon.setAttribute('transform',`translate(${x},${y}) scale(${size/24})`);icon.setAttribute('d',kind==='duplicate'?'M8 8h10v10H8z M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1':'M4 7h16 M9 7V4h6v3 M7 7l1 13h8l1-13 M10 10v7 M14 10v7');group.append(icon);
    const activate=event=>{event?.preventDefault();event?.stopPropagation();onAction({type:kind==='duplicate'?'DUPLICATE_MASK':'DELETE_MASK',maskId:mask.id});};
    group.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();});
    group.addEventListener('click',activate);group.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){activate(event);}});
    svg.append(group);
  }
  function render(){
    const doc=state.document,page=doc&&doc.pages.find(p=>p.id===state.pageId);
    cancelViewFrame();viewGeometry=null;
    svg.replaceChildren();questionMarkers=[];
    if(!page){svg.removeAttribute('viewBox');image.style.transform='';svg.style.transform='';return;}
    const asset=doc.assets.find(a=>a.id===page.imageId);if(!asset)return;
    svg.setAttribute('viewBox',`0 0 ${asset.width} ${asset.height}`);
    const hit=svgNode('rect');hit.classList.add('mask-hit-surface');hit.setAttribute('x','0');hit.setAttribute('y','0');hit.setAttribute('width',String(asset.width));hit.setAttribute('height',String(asset.height));hit.setAttribute('aria-hidden','true');svg.append(hit);
    const visible=state.mode==='study'?core.visibilityFor(doc,state.session):null;
    // Revealed answer hit areas stay underneath overlapping closed covers.
    const layer=mask=>mask.kind==='auxiliary'?2:visible&&!visible.get(mask.id)?0:1;
    const pageMasks=doc.masks.filter(mask=>mask.pageId===page.id).sort((a,b)=>layer(a)-layer(b));
    for(const mask of pageMasks){
      const openAnswer=state.mode==='study'&&!visible.get(mask.id);
      if(openAnswer&&state.session?.mode!=='free')continue;
      const px=core.rectToPixels(mask.rect,asset.width,asset.height),rect=svgNode('rect');
      const x=Math.max(0,px.x-.5),y=Math.max(0,px.y-.5),w=Math.min(asset.width-x,px.w+1),h=Math.min(asset.height-y,px.h+1);
      rect.setAttribute('x',String(x));rect.setAttribute('y',String(y));rect.setAttribute('width',String(w));rect.setAttribute('height',String(h));
      rect.dataset.maskId=mask.id;rect.classList.add(openAnswer?'open-answer-target':'mask-rect');if(mask.kind==='auxiliary')rect.classList.add('auxiliary');if(state.mode==='edit'&&(mask.id===state.selectedMaskId||state.selectedMaskIds?.includes(mask.id)))rect.classList.add('selected');
      const guided=state.mode==='study'&&state.session?.mode==='guided',currentGuided=guided&&!state.session.ended?state.session.queue[state.session.index]?.questionId:null;
      if(state.mode==='study'&&!guided&&mask.kind==='answer')rect.setAttribute('aria-pressed',String(openAnswer));
      const interactive=state.mode==='edit'||(mask.kind==='answer'&&(!guided||mask.questionId===currentGuided));
      if(interactive){rect.setAttribute('tabindex','0');rect.setAttribute('role','button');rect.setAttribute('aria-label',translate(openAnswer?'hideOpenAnswer':state.mode==='study'?'coveredAnswerLabel':'coverLabel'));}
      else rect.setAttribute('aria-hidden','true');
      const activate=()=>{if(state.mode==='study'&&mask.kind==='answer'){if(guided)onAction({type:'REVEAL_CURRENT',questionId:mask.questionId});else onAction({type:'TOGGLE_QUESTION',questionId:mask.questionId});}else if(state.mode==='edit')onAction({type:'SELECT_MASK',maskId:mask.id});};
      if(interactive&&pointerActions){
        let pointerGesture=null;
        rect.addEventListener('pointerdown',event=>{
          if(event.button!==0)return;
          pointerGesture={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,distanceCssPx:0,cancelled:false};
        });
        rect.addEventListener('pointermove',event=>{
          if(!pointerGesture||event.pointerId!==pointerGesture.pointerId)return;
          pointerGesture.distanceCssPx=Math.max(pointerGesture.distanceCssPx,Math.hypot(event.clientX-pointerGesture.startX,event.clientY-pointerGesture.startY));
        });
        rect.addEventListener('pointercancel',event=>{if(pointerGesture&&event.pointerId===pointerGesture.pointerId)pointerGesture.cancelled=true;});
        rect.addEventListener('click',event=>{
          event.stopPropagation();
          if(event.detail===0){pointerGesture=null;return;}
          const tap=!pointerGesture||core.isTap(pointerGesture);pointerGesture=null;if(tap)activate();
        });
      }
      if(interactive)rect.addEventListener('keydown',event=>{if(event.repeat)return;if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();
        if(state.mode==='study')svg.querySelector('[data-mask-id="'+mask.id+'"]')?.focus({preventScroll:true});}});
      svg.append(rect);
      if(guided&&mask.kind==='answer'&&mask.questionId===currentGuided){
        rect.classList.add('current-answer');
        const marker=svgNode('g'),disc=svgNode('circle'),label=svgNode('text');
        marker.classList.add('question-marker');marker.setAttribute('aria-hidden','true');
        disc.setAttribute('r','11');label.setAttribute('y','4');label.textContent=String(state.session.index+1);
        marker.append(disc,label);svg.append(marker);
        questionMarkers.push({node:marker,x:x+w/2,y:y+h/2,width:w,height:h,imageWidth:asset.width});
      }
      if(state.mode==='edit'&&mask.id===state.selectedMaskId){
        const radius=Math.max(1.5,Math.min(32,Math.max(asset.width,asset.height)*.012));
        const corners=[['nw',px.x,px.y],['ne',px.x+px.w,px.y],['sw',px.x,px.y+px.h],['se',px.x+px.w,px.y+px.h]];
        for(const [corner,cx,cy] of corners){
          const handle=svgNode('circle');handle.classList.add('mask-resize-handle');handle.dataset.maskId=mask.id;handle.dataset.resizeCorner=corner;
          handle.setAttribute('cx',String(cx));handle.setAttribute('cy',String(cy));handle.setAttribute('r',String(radius));handle.setAttribute('aria-hidden','true');svg.append(handle);
        }
        const actionSize=Math.max(8,Math.min(34,Math.max(asset.width,asset.height)*.04)),gap=Math.max(2,actionSize*.18),total=actionSize*2+gap;
        const actionX=Math.max(2,Math.min(asset.width-total-2,px.x+px.w-total));
        let actionY=px.y-actionSize-gap;if(actionY<2)actionY=Math.min(asset.height-actionSize-2,px.y+px.h+gap);
        addInlineAction(mask,'duplicate',actionX,actionY,actionSize);addInlineAction(mask,'delete',actionX+actionSize+gap,actionY,actionSize);
      }
    }
    rememberSurfaceBox();
  }
  function mount(next){state={...state,...next};render();}
  function setSelection(maskId){state={...state,selectedMaskId:maskId};render();}
  function destroy(){cancelViewFrame();resizeObserver?.disconnect();state={document:null,pageId:null,session:null,mode:'edit',selectedMaskId:null,selectedMaskIds:[]};viewStates.clear();readingFrame=null;svg.replaceChildren();image.style.transform='';svg.style.transform='';lastSurfaceBox=null;viewGeometry=null;}
  return Object.freeze({mount,render,setSelection,getViewState,setViewState,getViewGeometry,flushView,destroy});
}
