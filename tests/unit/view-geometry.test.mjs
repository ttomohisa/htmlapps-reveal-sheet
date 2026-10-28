import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFactory,toPlain} from '../helpers/load-factory.mjs';

const core=loadFactory('src/reveal/core.js','createRevealCore')();
const createStudyView=loadFactory('src/reveal/study-view.js','createStudyView');

// The renderer needs layout measurements. Keep its real state/transform code and
// substitute only the browser-owned DOM and animation-frame clock in Node.
function viewFixture({width=320,height=500,imageWidth=1000,imageHeight=500}={}){
  let nextFrame=0;
  const frames=new Map();
  const node=()=>({style:{},dataset:{},classList:{add(){}},setAttribute(){},removeAttribute(){},append(){},replaceChildren(){}});
  const surface={clientWidth:width,clientHeight:height,clientLeft:0,clientTop:0,getBoundingClientRect:()=>({left:10,top:20,width,height})};
  const image=node(),svg={...node(),clientWidth:width,clientHeight:height};
  image.closest=()=>surface;
  const dom={getElementById:id=>id==='maskSvg'?svg:image,createElementNS:node,defaultView:{requestAnimationFrame:callback=>{const id=++nextFrame;frames.set(id,callback);return id;},cancelAnimationFrame:id=>frames.delete(id)}};
  const view=createStudyView({core,dom,onAction(){}});
  const document={pages:[{id:'page',imageId:'asset'}],assets:[{id:'asset',width:imageWidth,height:imageHeight}],masks:[]};
  view.mount({document,pageId:'page'});
  return {view,image,svg,paint(){const pending=[...frames.values()];frames.clear();for(const callback of pending)callback();}};
}

function translation(style,width,height){
  const match=/translate\(\s*([-\d.e]+)(px|%)\s*,\s*([-\d.e]+)(px|%)\s*\)/.exec(style.transform);
  assert.ok(match,'the image has a CSS translation');
  return {x:Number(match[1])*(match[2]==='%'?width/100:1),y:Number(match[3])*(match[4]==='%'?height/100:1)};
}

test('a normalized image center renders at the viewport center with landscape letterboxing',()=>{
  const {view,image,svg}=viewFixture();
  view.setViewState('page',{zoom:4,centerX:.6,centerY:.4});
  const shift=translation(image.style,320,500);
  // A 1000×500 image fits as 320×160. Its (.6,.4) point is 128px
  // right and 64px above the viewport center at 4× zoom.
  assert.ok(Math.abs(shift.x+128)<.001);
  assert.ok(Math.abs(shift.y-64)<.001);
  assert.equal(image.style.transform,svg.style.transform);
});

test('a normalized image center renders at the viewport center with portrait letterboxing',()=>{
  const {view,image}=viewFixture({width:500,height:320,imageWidth:500,imageHeight:1000});
  view.setViewState('page',{zoom:4,centerX:.6,centerY:.4});
  const shift=translation(image.style,500,320);
  assert.ok(Math.abs(shift.x+64)<.001);
  assert.ok(Math.abs(shift.y-128)<.001);
});

test('zooming below fit keeps the image centered instead of clamping to a corner',()=>{
  const {view,image}=viewFixture();
  view.setViewState('page',{zoom:.5,centerX:.5,centerY:.5});
  assert.deepEqual(toPlain(view.getViewState('page')),{zoom:.5,centerX:.5,centerY:.5});
  assert.deepEqual(translation(image.style,320,500),{x:0,y:0});
});

test('deferred view updates paint the latest position once and can be flushed before pointer release',()=>{
  const {view,image,paint}=viewFixture();
  const initial=image.style.transform;
  view.setViewState('page',{zoom:4,centerX:.6,centerY:.4},{defer:true});
  view.setViewState('page',{zoom:4,centerX:.55,centerY:.45},{defer:true});
  assert.equal(image.style.transform,initial,'pointer updates wait for the next frame');
  paint();
  const shift=translation(image.style,320,500);
  assert.ok(Math.abs(shift.x+64)<.001);
  assert.ok(Math.abs(shift.y-32)<.001);
  view.setViewState('page',{zoom:4,centerX:.5,centerY:.5},{defer:true});
  view.flushView();
  assert.deepEqual(translation(image.style,320,500),{x:0,y:0});
  paint();
  assert.deepEqual(translation(image.style,320,500),{x:0,y:0});
});
