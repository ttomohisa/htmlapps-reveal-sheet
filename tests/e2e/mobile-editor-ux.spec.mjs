import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';

async function atImage(page,x,y){
  return page.locator('#maskSvg').evaluate((svg,p)=>{
    const point=svg.createSVGPoint();point.x=p[0];point.y=p[1];
    const result=point.matrixTransform(svg.getScreenCTM());return{x:result.x,y:result.y};
  },[x,y]);
}
async function dragImage(page,from,to){
  const a=await atImage(page,...from),b=await atImage(page,...to);
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:5});await page.mouse.up();
}

test('mobile: choose a camera photo through the same on-device image pipeline',async({page})=>{
  await page.setViewportSize({width:390,height:780});await openApp(page);
  await expect(page.locator('#cameraButton')).toBeVisible();
  await expect(page.locator('#cameraInput')).toHaveAttribute('capture','environment');
  await page.locator('#cameraInput').setInputFiles(imagePath('static.jpg'));
  await expect(page.locator('#previewImage')).toBeVisible();
  await expect(page.locator('#pageList .page-item')).toHaveCount(1);
  await expect(page.locator('#mobilePageSwitch')).toBeVisible();
});

test('mobile: page switcher keeps cards collapsed until needed',async({page})=>{
  await page.setViewportSize({width:390,height:780});await openApp(page);
  await page.locator('#imageInput').setInputFiles([imagePath('static.png'),imagePath('static.jpg'),imagePath('static.webp')]);
  await expect(page.locator('#pageList .page-item')).toHaveCount(3);
  await expect(page.locator('.page-panel')).toBeHidden();
  await expect(page.locator('#mobilePagePosition')).toHaveText('Page 3 of 3');
  await page.locator('#mobilePrevPage').click();
  await expect(page.locator('#mobilePagePosition')).toHaveText('Page 2 of 3');
  await page.locator('#mobilePageToggle').click();
  await expect(page.locator('.page-panel')).toBeVisible();
  await expect(page.locator('#mobilePageToggle')).toHaveAttribute('aria-expanded','true');
  await page.locator('#pageList .page-item').first().locator('.page-card-meta').click();
  await expect(page.locator('.page-panel')).toBeHidden();
  await expect(page.locator('#mobilePagePosition')).toHaveText('Page 1 of 3');
});

test('mobile: draw/pan controls and cover nudge/resize preserve Undo',async({page})=>{
  await page.setViewportSize({width:390,height:780});await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#drawModeButton')).toHaveAttribute('aria-pressed','true');
  await page.locator('#viewZoomIn').click();await page.locator('#viewZoomIn').click();
  const before=await page.locator('#maskSvg').evaluate(svg=>+svg.dataset.viewCenterX);
  await page.locator('#panModeButton').click();
  await expect(page.locator('#panModeButton')).toHaveAttribute('aria-pressed','true');
  await dragImage(page,[60,35],[40,35]);
  const after=await page.locator('#maskSvg').evaluate(svg=>+svg.dataset.viewCenterX);
  expect(after).not.toBe(before);
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(0);
  await page.locator('#viewFit').click();await page.locator('#drawModeButton').click();
  await dragImage(page,[20,20],[50,43]);
  const rect=page.locator('#maskSvg .mask-rect');
  await expect(rect).toHaveCount(1);
  await expect(page.locator('#maskQuickActions')).toBeVisible();
  await page.locator('#maskFineAdjustButton').click();
  const beforeX=Number(await rect.getAttribute('x'));
  await page.locator('#maskFineControls [data-mask-direction="right"]').click();
  expect(Number(await rect.getAttribute('x'))).toBeGreaterThan(beforeX);
  const beforeWidth=Number(await rect.getAttribute('width'));
  await page.locator('#maskAdjustResize').click();
  await page.locator('#maskFineControls [data-mask-direction="right"]').click();
  expect(Number(await rect.getAttribute('width'))).toBeGreaterThan(beforeWidth);
  await expect(page.locator('#editorSheet')).toBeHidden();
  await page.locator('#maskFineClose').click();
  await page.locator('#mobileUndoButton').click();
  expect(Number(await rect.getAttribute('width'))).toBeCloseTo(beforeWidth,1);
  await page.locator('#maskQuickDuplicate').click();
  await expect(rect).toHaveCount(2);
  await page.locator('#maskQuickDelete').click();
  await expect(rect).toHaveCount(1);
  await page.locator('#languageButton').click();
  await expect(page.locator('#panModeButton')).toContainText('画像を動かす');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('mobile: two-finger touch pinch zooms without adding accidental covers',async({page})=>{
  await page.setViewportSize({width:390,height:780});await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#maskSvg')).toBeVisible();
  const box=await page.locator('#maskSvg').boundingBox();
  const y=Math.round(box.y+box.height*.55);
  const x=Math.round(box.x+box.width*.5);
  const client=await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-20,y,id:1},{x:x+20,y,id:2}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-65,y,id:1},{x:x+65,y,id:2}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(()=>page.locator('#maskSvg').evaluate(svg=>+svg.dataset.viewZoom)).toBeGreaterThan(1.5);
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(0);
});

test('mobile: initial action layout and cover color before adding an image',async({page})=>{
  await page.setViewportSize({width:390,height:780});await openApp(page);
  await expect(page.locator('#cameraButton')).toBeVisible();
  await expect(page.locator('#newButton')).toBeHidden();
  await expect(page.locator('.page-panel')).toBeHidden();
  await expect(page.locator('#coverColor')).toBeEnabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#coverColor').fill('#aabbcc');
  await page.locator('#coverColor').dispatchEvent('change');
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  await expect(page.locator('#coverColor')).toHaveValue('#aabbcc');
  await page.locator('#mobileMoreButton').click();
  await expect(page.locator('#newButton')).toBeVisible();
  await page.locator('#editorSheetClose').click();
});

test('desktop: live camera preview captures locally and releases tracks',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
      getUserMedia:async()=>{
        const canvas=document.createElement('canvas');canvas.width=160;canvas.height=120;
        const ctx=canvas.getContext('2d');ctx.fillStyle='#a1b2c3';ctx.fillRect(0,0,160,120);
        const stream=canvas.captureStream(15);window.__testCameraStream=stream;return stream;
      }
    }});
  });
  await openApp(page);
  await expect(page.locator('#cameraButton')).toBeVisible();
  await page.locator('#cameraButton').click();
  await expect(page.locator('#cameraDialog')).toBeVisible();
  await expect(page.locator('#cameraShutterButton')).toBeEnabled();
  await page.locator('#cameraShutterButton').click();
  await expect(page.locator('#previewImage')).toBeVisible();
  await expect(page.locator('#cameraDialog')).toBeHidden();
  expect(await page.evaluate(()=>window.__testCameraStream.getTracks().every(track=>track.readyState==='ended'))).toBe(true);
});

test('desktop: denied camera access shows a useful error and preserves an empty sheet',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(navigator,'mediaDevices',{
    configurable:true,value:{getUserMedia:async()=>{throw new DOMException('denied','NotAllowedError');}}
  }));
  await openApp(page);
  await page.locator('#cameraButton').click();
  await expect(page.locator('#cameraStatus')).toContainText(/denied|許可され/i);
  await expect(page.locator('#cameraShutterButton')).toBeDisabled();
  await page.locator('#cameraCancelButton').click();
  await expect(page.locator('#cameraDialog')).toBeHidden();
  await expect(page.locator('#pageList .page-item')).toHaveCount(0);
});
