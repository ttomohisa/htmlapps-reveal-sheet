import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {loadFactory,testContext} from '../helpers/load-factory.mjs';
function base(){return {core:loadFactory('src/reveal/core.js','createRevealCore')(),bytes:new Uint8Array(fs.readFileSync('tests/fixtures/images/static.png'))};}
test('T02: cancel after decode closes bitmap and never draws',async()=>{
 const {core,bytes}=base();let finish,closed=0,drawn=0;
 const env={Blob,atob,btoa,createImageBitmap:()=>new Promise(resolve=>{finish=()=>resolve({width:120,height:80,close(){closed++;}});}),document:{createElement(){drawn++;throw new Error('must not draw');}}};
 const io=loadFactory('src/reveal/image-io.js','createImageIO')({core,env});const controller=new AbortController();
 const task=io.normalize(new Blob([bytes],{type:'image/png'}),{signal:controller.signal,ctx:testContext()});
 while(!finish)await new Promise(r=>setTimeout(r,0));controller.abort();finish();await assert.rejects(task,{code:'CANCELLED'});assert.equal(closed,1);assert.equal(drawn,0);
});
test('T02: successful normalization and Canvas failure release resources',async()=>{
 for(const fail of [false,true]){
 const {core,bytes}=base();let closed=0,options,canvas;
 const env={Blob,atob,btoa,createImageBitmap:async(file,opts)=>{options=opts;return {width:120,height:80,close(){closed++;}};},document:{createElement(){canvas={width:0,height:0,getContext:()=>({drawImage(){}}),toBlob:fn=>fn(fail?null:new Blob([bytes],{type:'image/png'}))};return canvas;}}};
 const io=loadFactory('src/reveal/image-io.js','createImageIO')({core,env});const task=io.normalize(new Blob([bytes]),{ctx:testContext()});
 if(fail)await assert.rejects(task,{code:'DECODE_FAILED'});else{const asset=await task;assert.equal(asset.byteLength,bytes.length);assert.equal(asset.mime,'image/png');assert.equal(asset.width,120);}
 assert.equal(options.imageOrientation,'from-image');assert.equal(closed,1);assert.equal(canvas.width,0);assert.equal(canvas.height,0);
 }
});
test('T02: preview URLs are limited to current and previous and explicitly revoked',()=>{
 const {core}=base();let created=0;const revoked=[];const env={Blob,atob,btoa,URL:{createObjectURL:()=>`blob:${++created}`,revokeObjectURL:u=>revoked.push(u)}};
 const io=loadFactory('src/reveal/image-io.js','createImageIO')({core,env});const asset=id=>({id,dataBase64:'AA=='});
 io.urlFor(asset('a'));io.urlFor(asset('b'));assert.equal(io.urlFor(asset('a')),'blob:1');io.urlFor(asset('c'));assert.deepEqual(revoked,['blob:2']);io.releaseAll();assert.deepEqual(revoked,['blob:2','blob:1','blob:3']);io.releaseAll();assert.equal(revoked.length,3);
});
test('T02: stored image uses exact decoded PNG, rejects falsified size and noncanonical base64',async()=>{
 const {core,bytes}=base();let closed=0;const env={Blob,atob,btoa,createImageBitmap:async()=>({width:120,height:80,close(){closed++;}})};
 const io=loadFactory('src/reveal/image-io.js','createImageIO')({core,env});const asset={mime:'image/png',width:120,height:80,byteLength:bytes.length,dataBase64:Buffer.from(bytes).toString('base64')};
 await io.verifyStoredAsset(asset);assert.equal(closed,1);await assert.rejects(io.verifyStoredAsset({...asset,byteLength:1}),{code:'INVALID_SHEET'});
 for(const value of ['','AA=','AB==','AA==\n','data:image/png,AA=='])assert.throws(()=>io.decodeBase64(value),{code:'INVALID_SHEET'});
});
