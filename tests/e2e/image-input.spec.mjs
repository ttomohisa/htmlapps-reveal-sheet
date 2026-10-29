import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';
const loaded=page=>expect(page.locator('#previewImage')).toBeVisible();
test('T02: selection order, static types, failures and undo',async({page})=>{
 await openApp(page);
 await page.locator('#imageInput').setInputFiles([imagePath('static.jpg'),imagePath('unsupported.gif'),imagePath('static.png'),imagePath('static.webp')]);
 await expect(page.locator('#pageList .page-item')).toHaveCount(3);
 await loaded(page);
 await expect(page.locator('#failureList')).toContainText('unsupported.gif');
 await expect(page.locator('#pageList input.page-card-title').first()).toHaveValue('Page 1');
 await page.locator('#undoButton').click();await expect(page.locator('#pageList .page-item')).toHaveCount(2);
 await page.locator('#redoButton').click();await expect(page.locator('#pageList .page-item')).toHaveCount(3);
 await expect(page.locator('#studyButton')).toBeDisabled();
});
for(let orientation=1;orientation<=8;orientation++)test('T02: normalized pixels match EXIF '+orientation,async({page})=>{
 await openApp(page);await page.locator('#imageInput').setInputFiles(imagePath(`orientation-${orientation}.jpg`));await loaded(page);
 const result=await page.locator('#previewImage').evaluate(img=>{
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
  return {width:c.width,height:c.height,corners:[[.25,.25],[.75,.25],[.25,.75],[.75,.75]].map(([x,y])=>Array.from(ctx.getImageData(Math.floor(c.width*x),Math.floor(c.height*y),1,1).data))};
 });
 expect(result.width).toBe(orientation>=5?80:120);expect(result.height).toBe(orientation>=5?120:80);
 const original=[[255,0,0],[0,128,0],[0,0,255],[255,255,0]];
 const order={1:[0,1,2,3],2:[1,0,3,2],3:[3,2,1,0],4:[2,3,0,1],5:[0,2,1,3],6:[2,0,3,1],7:[3,1,2,0],8:[1,3,0,2]}[orientation];
 result.corners.forEach((rgba,i)=>original[order[i]].forEach((v,ch)=>expect(Math.abs(rgba[ch]-v)).toBeLessThanOrEqual(6)));
 await expect(page.locator('#pageList')).not.toContainText('orientation-');
});
test('T02: alpha preserved, PNG normalized with original dimensions',async({page})=>{
 await openApp(page);await page.locator('#imageInput').setInputFiles(imagePath('transparent.png'));await loaded(page);
 const out=await page.locator('#previewImage').evaluate(img=>{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);return {alpha:x.getImageData(0,0,1,1).data[3],w:c.width,h:c.height};});expect(out).toEqual({alpha:0,w:120,h:80});
});
test('T02: invalid image leaves existing page intact and makes no external request',async({page})=>{
 const requests=[];page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await openApp(page);await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await loaded(page);
 await page.locator('#imageInput').setInputFiles([imagePath('animated.png'),imagePath('animated.webp'),imagePath('truncated.png'),imagePath('oversize-header.png')]);
 await expect(page.locator('#failureList li')).toHaveCount(4);await expect(page.locator('#pageList .page-item')).toHaveCount(1);await loaded(page);expect(requests).toEqual([]);
});
test('T02: URL/HTML paste is ignored, file paste is accepted',async({page})=>{
 await openApp(page);
 await page.evaluate(()=>{const d=new DataTransfer();d.setData('text/html','<img src="https://example.invalid/secret">');d.setData('text/plain','https://example.invalid/secret');document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:d,bubbles:true}));});
 await expect(page.locator('#pageList .page-item')).toHaveCount(0);
 const data=await import('node:fs').then(fs=>Array.from(fs.readFileSync(imagePath('static.png'))));
 await page.evaluate(bytes=>{const d=new DataTransfer();d.items.add(new File([new Uint8Array(bytes)],'pasted.png',{type:'image/png'}));document.dispatchEvent(new ClipboardEvent('paste',{clipboardData:d,bubbles:true}));},data);
 await expect(page.locator('#pageList .page-item')).toHaveCount(1);await loaded(page);
});
test('T02: cancelling retains completed pages and disposes pending decode',async({page})=>{
 await openApp(page);
 await page.evaluate(()=>{const original=window.createImageBitmap;let calls=0;window.createImageBitmap=async(...args)=>{if(++calls===2)await new Promise(r=>{window.finishPendingDecode=r;});return original(...args);};});
 await page.locator('#imageInput').setInputFiles([imagePath('static.png'),imagePath('static.jpg'),imagePath('static.webp')]);
 await expect(page.locator('#pageList .page-item')).toHaveCount(1);
 await expect.poll(()=>page.evaluate(()=>typeof window.finishPendingDecode)).toBe('function');
 await page.locator('#cancelButton').click();await page.evaluate(()=>window.finishPendingDecode());
 await expect(page.locator('#cancelButton')).toBeHidden();await expect(page.locator('#pageList .page-item')).toHaveCount(1);await loaded(page);
});
test('T02: replacing document discards old decode; confirmation cancel retains pages',async({page})=>{
 await openApp(page);await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await loaded(page);
 await page.locator('#newButton').click();await page.locator('#appConfirmCancel').click();await expect(page.locator('#pageList .page-item')).toHaveCount(1);
 await page.evaluate(()=>{const original=window.createImageBitmap;window.createImageBitmap=async(...args)=>{await new Promise(r=>{window.finishPendingDecode=r;});return original(...args);};});
 await page.locator('#imageInput').setInputFiles(imagePath('static.jpg'));await expect.poll(()=>page.evaluate(()=>typeof window.finishPendingDecode)).toBe('function');
 await page.locator('#newButton').click();await page.locator('#appConfirmOk').click();await page.evaluate(()=>window.finishPendingDecode());
 await expect(page.locator('#pageList .page-item')).toHaveCount(0);await expect(page.locator('#previewImage')).toBeHidden();await expect(page.locator('#undoButton')).toBeDisabled();
});
test('T02: language switch retains page and view; no persistent content is written',async({page})=>{
 await openApp(page);await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await loaded(page);
 await page.locator('#languageButton').click();await expect(page.locator('#pageList .page-item')).toHaveCount(1);await loaded(page);
 expect(await page.evaluate(()=>{try{return Object.keys(localStorage).filter(k=>k.includes('reveal'));}catch{return [];}})).toEqual([]);
});


test('T02: 2160x3840 phone photo remains visible through Save/Create navigation',async({page})=>{
  test.setTimeout(180000);
  await openApp(page);
  // Generate synthetic high-detail pixels: no user photo is added to the repo.
  const dataUrl=await page.evaluate(async()=>{
    const c=document.createElement('canvas');c.width=2160;c.height=3840;
    const ctx=c.getContext('2d'),pixels=ctx.createImageData(c.width,c.height);
    let state=0x68a2d421;
    // 8x8 synthetic blocks normalize to about 15 MiB of PNG data,
    // comparable to the reported phone JPEG (not an extreme 28 MiB texture).
    const blocks=new Uint32Array(270*480);
    for(let i=0;i<blocks.length;i++){
      state=(Math.imul(state,1664525)+1013904223)>>>0;blocks[i]=state;
    }
    for(let y=0;y<3840;y++)for(let x=0;x<2160;x++){
      const n=(y*2160+x)*4,v=blocks[(y>>3)*270+(x>>3)];
      pixels.data[n]=v>>>24;
      pixels.data[n+1]=v>>>16;
      pixels.data[n+2]=v>>>8;
      pixels.data[n+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    return c.toDataURL('image/jpeg',.84);
  });
  await page.locator('#imageInput').setInputFiles({
    name:'synthetic-tall-photo.jpg',mimeType:'image/jpeg',
    buffer:Buffer.from(dataUrl.split(',')[1],'base64')
  });
  await expect(page.locator('#pageList .page-item')).toHaveCount(1,{timeout:60000});
  try{await expect(page.locator('#previewImage')).toBeVisible({timeout:60000});}
  catch(error){
    const debug=await page.evaluate(()=>{
      const image=document.getElementById('previewImage'),wait=document.getElementById('previewWait');
      return {complete:image.complete,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,
        srcLength:image.getAttribute('src')?.length||0,waitHidden:wait.hidden,waitText:wait.textContent,
        busy:document.body.className,status:document.getElementById('inputStatus')?.textContent};
    });
    console.error('Tall-photo preview diagnostic',JSON.stringify(debug));
    throw error;
  }
  await expect(page.locator('#previewWait')).toBeHidden();
  await expect(page.locator('#maskSvg')).toBeVisible();
  const image=page.locator('#previewImage');
  expect(await image.evaluate(node=>[node.naturalWidth,node.naturalHeight])).toEqual([2160,3840]);
  await expect(page.locator('#imageBytes')).not.toHaveText('');
  const points=await page.locator('#maskSvg').evaluate(svg=>{
    const m=svg.getScreenCTM();
    return [[360,380],[770,850]].map(([x,y])=>{
      const p=svg.createSVGPoint();p.x=x;p.y=y;
      const q=p.matrixTransform(m);return {x:q.x,y:q.y};
    });
  });
  await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();
  await page.mouse.move(points[1].x,points[1].y,{steps:5});await page.mouse.up();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
  await page.locator('#saveButton').click();
  await expect(page.locator('#inputStatus')).toContainText(/保存する形式|Choose a format/i);
  const jsonPromise=page.waitForEvent('download',{timeout:20000});
  page.on('console',msg=>{if(msg.text().includes('Reveal Sheet save failed'))console.log('Large-photo save console:',msg.text());});
  await page.locator('#downloadJsonButton').click();
  try{await expect(page.locator('#inputStatus')).toContainText(/保存を開始|Started saving/,{timeout:15000});}
  catch(error){
    const values=await page.evaluate(()=>({
      status:document.querySelector('#inputStatus')?.textContent,
      jsonSize:document.querySelector('#saveJsonBytes')?.textContent,
      htmlSize:document.querySelector('#saveHtmlBytes')?.textContent,
      jsonDisabled:document.querySelector('#downloadJsonButton')?.disabled,
      htmlDisabled:document.querySelector('#downloadHtmlButton')?.disabled,
      questionCount:document.querySelector('#saveQuestionCount')?.textContent,
      pageCount:document.querySelector('#savePageCount')?.textContent
    }));
    console.error('Large-photo save diagnosis',JSON.stringify(values));
    throw error;
  }
  const jsonDownload=await jsonPromise;
  expect(jsonDownload.suggestedFilename()).toMatch(/\.reveal\.json$/);
  const htmlPromise=page.waitForEvent('download');
  await page.locator('#downloadHtmlButton').click();
  const htmlDownload=await htmlPromise;
  expect(htmlDownload.suggestedFilename()).toMatch(/\.reveal\.html$/);
  await expect(page.locator('#inputStatus')).toContainText(/保存を開始|Started saving/);
  await page.locator('#createButton').click();
  await expect(image).toBeVisible({timeout:15000});
});

test('T02: preview recovers from a transient image.decode rejection without reimporting',async({page})=>{
  await openApp(page);
  await page.evaluate(()=>{
    const original=HTMLImageElement.prototype.decode;
    let rejected=false;
    HTMLImageElement.prototype.decode=function(...args){
      if(this.id==='previewImage'&&!rejected){
        rejected=true;
        return Promise.reject(new Error('Simulated transient mobile image decode failure'));
      }
      return original.apply(this,args);
    };
  });
  await page.locator('#imageInput').setInputFiles(imagePath('static.jpg'));
  await expect(page.locator('#pageList .page-item')).toHaveCount(1);
  await expect(page.locator('#previewImage')).toBeVisible({timeout:15000});
  await expect(page.locator('#maskSvg')).toBeVisible();
  await expect(page.locator('#previewWait')).toBeHidden();
});
