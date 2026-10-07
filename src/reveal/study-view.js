/** Shared image-overlay renderer and per-page view state for editing and study. */
function createStudyView({core,dom,onAction,translate=key=>key}) {
  const svg=dom.getElementById('maskSvg'),image=dom.getElementById('previewImage'),surface=image.closest('.preview-surface');
  const viewStates=new Map();
  let state={document:null,pageId:null,session:null,mode:'edit',selectedMaskId:null,selectedMaskIds:[]};
  let lastSurfaceBox=null;
  const defaultView=()=>({zoom:1,centerX:.5,centerY:.5});
  function normalizeView(value){
    const zoom=Math.max(.5,Math.min(16,Number(value?.zoom)||1)),half=.5/zoom;
    const clamp=value=>Math.max(half,Math.min(1-half,Number.isFinite(Number(value))?Number(value):.5));
    return {zoom:Math.round(zoom*1e6)/1e6,centerX:Math.round(clamp(value?.centerX)*1e6)/1e6,centerY:Math.round(clamp(value?.centerY)*1e6)/1e6};
  }
  function getViewState(pageId=state.pageId){return {...(viewStates.get(pageId)||defaultView())};}
  function applyView(){
    if(!state.pageId)return;
    const view=getViewState(state.pageId),tx=(.5-view.centerX)*100,ty=(.5-view.centerY)*100,transform=`translate(${tx}% , ${ty}%) scale(${view.zoom})`;
    image.style.transformOrigin='50% 50%';svg.style.transformOrigin='50% 50%';image.style.transform=transform;svg.style.transform=transform;
    svg.dataset.viewZoom=String(view.zoom);svg.dataset.viewCenterX=String(view.centerX);svg.dataset.viewCenterY=String(view.centerY);
  }
  function setViewState(pageId,value){if(!pageId)return defaultView();const view=normalizeView(value);viewStates.set(pageId,view);if(pageId===state.pageId)applyView();return {...view};}
  function rememberSurfaceBox(){
    if(!surface)return;
    const rect=surface.getBoundingClientRect();
    if(!(rect.width>0&&rect.height>0))return;
    const next={width:rect.width,height:rect.height};
    if(lastSurfaceBox&&state.pageId){
      const resized=core.resizeView(getViewState(state.pageId),lastSurfaceBox,next);
      viewStates.set(state.pageId,resized);applyView();
    }
    lastSurfaceBox=next;
  }
  const ResizeObserverCtor=dom.defaultView?.ResizeObserver;
  const resizeObserver=surface&&typeof ResizeObserverCtor==='function'?new ResizeObserverCtor(()=>rememberSurfaceBox()):null;
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
    svg.replaceChildren();
    if(!page){svg.removeAttribute('viewBox');image.style.transform='';svg.style.transform='';return;}
    const asset=doc.assets.find(a=>a.id===page.imageId);if(!asset)return;
    svg.setAttribute('viewBox',`0 0 ${asset.width} ${asset.height}`);
    const hit=svgNode('rect');hit.classList.add('mask-hit-surface');hit.setAttribute('x','0');hit.setAttribute('y','0');hit.setAttribute('width',String(asset.width));hit.setAttribute('height',String(asset.height));hit.setAttribute('aria-hidden','true');svg.append(hit);
    const visible=state.mode==='study'?core.visibilityFor(doc,state.session):null;
    const pageMasks=doc.masks.filter(mask=>mask.pageId===page.id).sort((a,b)=>(a.kind==='auxiliary'?1:0)-(b.kind==='auxiliary'?1:0));
    for(const mask of pageMasks){
      if(state.mode==='study'&&!visible.get(mask.id))continue;
      const px=core.rectToPixels(mask.rect,asset.width,asset.height),rect=svgNode('rect');
      const x=Math.max(0,px.x-.5),y=Math.max(0,px.y-.5),w=Math.min(asset.width-x,px.w+1),h=Math.min(asset.height-y,px.h+1);
      rect.setAttribute('x',String(x));rect.setAttribute('y',String(y));rect.setAttribute('width',String(w));rect.setAttribute('height',String(h));
      rect.dataset.maskId=mask.id;rect.classList.add('mask-rect');if(mask.kind==='auxiliary')rect.classList.add('auxiliary');if(state.mode==='edit'&&(mask.id===state.selectedMaskId||state.selectedMaskIds?.includes(mask.id)))rect.classList.add('selected');
      const guided=state.mode==='study'&&state.session?.mode==='guided',currentGuided=guided&&!state.session.ended?state.session.queue[state.session.index]?.questionId:null;
      const interactive=state.mode==='edit'||(mask.kind==='answer'&&(!guided||mask.questionId===currentGuided));
      if(interactive){rect.setAttribute('tabindex','0');rect.setAttribute('role','button');rect.setAttribute('aria-label',translate(state.mode==='study'?'coveredAnswerLabel':'coverLabel'));}
      else rect.setAttribute('aria-hidden','true');
      const activate=()=>{if(state.mode==='study'&&mask.kind==='answer'){if(guided)onAction({type:'REVEAL_CURRENT',questionId:mask.questionId});else onAction({type:'TOGGLE_QUESTION',questionId:mask.questionId});}else if(state.mode==='edit')onAction({type:'SELECT_MASK',maskId:mask.id});};
      if(interactive){
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
        rect.addEventListener('keydown',event=>{if(event.repeat)return;if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}});
      }
      svg.append(rect);
      if(state.mode==='edit'&&mask.id===state.selectedMaskId){
        const radius=Math.max(1.5,Math.min(32,Math.max(asset.width,asset.height)*.012));
        const corners=[['nw',px.x,px.y],['ne',px.x+px.w,px.y],['sw',px.x,px.y+px.h],['se',px.x+px.w,px.y+px.h]];
        for(const [corner,cx,cy] of corners){
          const handle=svgNode('circle');handle.classList.add('mask-resize-handle');handle.dataset.maskId=mask.id;handle.dataset.resizeCorner=corner;
          handle.setAttribute('cx',String(cx));handle.setAttribute('cy',String(cy));handle.setAttribute('r',String(radius));handle.setAttribute('aria-hidden','true');svg.append(handle);
        }
        const actionSize=Math.max(20,Math.min(34,Math.max(asset.width,asset.height)*.03)),gap=Math.max(3,actionSize*.18),total=actionSize*2+gap;
        const actionX=Math.max(2,Math.min(asset.width-total-2,px.x+px.w-total));
        let actionY=px.y-actionSize-gap;if(actionY<2)actionY=Math.min(asset.height-actionSize-2,px.y+px.h+gap);
        addInlineAction(mask,'duplicate',actionX,actionY,actionSize);addInlineAction(mask,'delete',actionX+actionSize+gap,actionY,actionSize);
      }
    }
    applyView();rememberSurfaceBox();
  }
  function mount(next){state={...state,...next};render();}
  function setSelection(maskId){state={...state,selectedMaskId:maskId};render();}
  function destroy(){resizeObserver?.disconnect();state={document:null,pageId:null,session:null,mode:'edit',selectedMaskId:null,selectedMaskIds:[]};viewStates.clear();svg.replaceChildren();image.style.transform='';svg.style.transform='';lastSurfaceBox=null;}
  return Object.freeze({mount,render,setSelection,getViewState,setViewState,destroy});
}
