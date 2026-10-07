import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';
const loaded=page=>expect(page.locator('#previewImage')).toBeVisible();
test('T02: selection order, static types, failures and undo',async({page})=>{
 await openApp(page);
 await page.locator('#imageInput').setInputFiles([imagePath('static.jpg'),imagePath('unsupported.gif'),imagePath('static.png'),imagePath('static.webp')]);
 await expect(page.locator('#pageList .page-item')).toHaveCount(3);
 await loaded(page);
 await expect(page.locator('#failureList')).toContainText('unsupported.gif');
 await expect(page.locator('#pageList .page-item').first()).toContainText('Page 1');
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
