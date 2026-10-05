/** Shared image-overlay renderer for editing and free study. */
function createStudyView({core,dom,onAction}) {
  const svg=dom.getElementById('maskSvg'),image=dom.getElementById('previewImage');\n  const viewStates=new Map();
  let state={document:null,pageId:null,session:null,mode:'edit',selectedMaskId:null,selectedMaskIds:[]};
  const defaultView=()=>({zoom:1,centerX:.5,centerY:.5});
  function normalizeView(value){
    const zoom=Math.max(.5,Math.min(16,Number(value?.zoom)||1)),half=.5/zoom;
    const clamp=value=>Math.max(half,Math.min(1-half,Number.isFinite(Number(value))?Number(value):.5));
    return {zoom:Math.round(zoom*1e6)/1e6,centerX:Math.round(clamp(value?.centerX)*1e6)/1e6,centerY:Math.round(clamp(value?.centerY)*1e6)/1e6};
  }
  function getViewState(pageId=state.pageId){return {...(viewStates.get(pageId)||defaultView())};}
  function applyView(){
    if(!state.pageId)return;const current=getViewState(state.pageId),tx=(.5-current.centerX)*100,ty=(.5-current.centerY)*100,transform='translate('+tx+'% , '+ty+'%) scale('+current.zoom+')';
    image.style.transformOrigin='50% 50%';svg.style.transformOrigin='50% 50%';image.style.transform=transform;svg.style.transform=transform;
    svg.dataset.viewZoom=String(current.zoom);svg.dataset.viewCenterX=String(current.centerX);svg.dataset.viewCenterY=String(current.centerY);
  }
  function setViewState(pageId,value){if(!pageId)return defaultView();const current=normalizeView(value);viewStates.set(pageId,current);if(pageId===state.pageId)applyView();return {...current};}
  function svgNode(name){return dom.createElementNS('http://www.w3.org/2000/svg',name);}
  function render(){
    const doc=state.document,page=doc&&doc.pages.find(p=>p.id===state.pageId);
    svg.replaceChildren();
    if(!page){svg.removeAttribute('viewBox');image.style.transform='';svg.style.transform='';return;}
    const asset=doc.assets.find(a=>a.id===page.imageId);if(!asset)return;
    svg.setAttribute('viewBox',`0 0 ${asset.width} ${asset.height}`);
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
      if(interactive){rect.setAttribute('tabindex','0');rect.setAttribute('role','button');rect.setAttribute('aria-label',state.mode==='study'?'Covered answer':'Cover');}
      else{rect.setAttribute('aria-hidden','true');}
      const activate=()=>{if(state.mode==='study'&&mask.kind==='answer'){if(guided)onAction({type:'REVEAL_CURRENT',questionId:mask.questionId});else onAction({type:'TOGGLE_QUESTION',questionId:mask.questionId});}else if(state.mode==='edit')onAction({type:'SELECT_MASK',maskId:mask.id});};
      if(interactive){rect.addEventListener('click',event=>{event.stopPropagation();activate();});rect.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}});}svg.append(rect);
    }
  }
  function mount(next){state={...state,...next};render();}
  function setSelection(maskId){state={...state,selectedMaskId:maskId};render();}
  function destroy(){state={document:null,pageId:null,session:null,mode:'edit',selectedMaskId:null,selectedMaskIds:[]};svg.replaceChildren();}
  return Object.freeze({mount,render,setSelection,destroy});
}
