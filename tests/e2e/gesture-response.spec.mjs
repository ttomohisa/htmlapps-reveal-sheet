import {test,expect} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import {openApp} from '../helpers/app.mjs';

async function loadImage(page,{width=1000,height=500}={}){
  await page.setViewportSize({width:390,height:780});
  await page.emulateMedia({reducedMotion:'reduce'});
  await openApp(page);
  const data=await page.evaluate(({width,height})=>{
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');context.fillStyle='#e3ebea';context.fillRect(0,0,width,height);
    context.fillStyle='#16624f';context.fillRect(width*.48,height*.48,width*.04,height*.04);
    return canvas.toDataURL('image/png').split(',')[1];
  },{width,height});
  await page.locator('#imageInput').setInputFiles({name:'gesture.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
  await expect(page.locator('#maskSvg')).toBeVisible();
}

async function imagePoint(page,x,y){
  return page.locator('#maskSvg').evaluate((svg,{x,y})=>{
    const point=svg.createSVGPoint();point.x=x;point.y=y;
    const result=point.matrixTransform(svg.getScreenCTM());return{x:result.x,y:result.y};
  },{x,y});
}

async function state(page){
  return page.locator('#maskSvg').evaluate(svg=>({zoom:+svg.dataset.viewZoom,centerX:+svg.dataset.viewCenterX,centerY:+svg.dataset.viewCenterY}));
}

async function touchClient(page){
  const client=await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:3});
  return client;
}

for(const [orientation,width,height] of [['landscape',1000,500],['portrait',500,1000]]){
  for(const [zoomLabel,clicks] of [['1.25×',1],['about 2×',3],['about 4×',6],['about 8×',9],['16×',13]]){
    test(`pan follows the pointer in CSS pixels: ${orientation}, ${zoomLabel}`,async({page})=>{
      await loadImage(page,{width,height});
      await page.locator('#panModeButton').click();
      for(let index=0;index<clicks;index++)await page.locator('#viewZoomIn').click();
      const before=await imagePoint(page,width/2,height/2);
      await page.mouse.move(before.x,before.y);await page.mouse.down();
      await page.mouse.move(before.x+20,before.y+16,{steps:4});await page.mouse.up();
      const after=await imagePoint(page,width/2,height/2);
      expect(after.x-before.x).toBeCloseTo(20,0);
      expect(after.y-before.y).toBeCloseTo(16,0);
      await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(0);
    });
  }
}

test('pinch keeps its image anchor and continues as a one-finger pan',async({page})=>{
  await loadImage(page);
  for(let index=0;index<3;index++)await page.locator('#viewZoomIn').click();
  const center=await imagePoint(page,500,250),mid={x:Math.round(center.x+16),y:Math.round(center.y+12)};
  const anchor=await page.locator('#maskSvg').evaluate((svg,mid)=>{
    const point=svg.createSVGPoint();point.x=mid.x;point.y=mid.y;
    const result=point.matrixTransform(svg.getScreenCTM().inverse());return{x:result.x,y:result.y};
  },mid);
  const client=await touchClient(page);
  const start=[{x:mid.x-24,y:mid.y,id:1},{x:mid.x+24,y:mid.y,id:2}];
  const moved=[{x:mid.x+12-40,y:mid.y+8,id:1},{x:mid.x+12+40,y:mid.y+8,id:2}];
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:start});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:moved});
  await expect.poll(async()=>Math.abs((await imagePoint(page,anchor.x,anchor.y)).x-(mid.x+12))).toBeLessThan(1);
  await expect.poll(async()=>Math.abs((await imagePoint(page,anchor.x,anchor.y)).y-(mid.y+8))).toBeLessThan(1);
  // CDP's nonempty touchEnd list contains contacts to end, not those remaining.
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[moved[0]]});
  const before=await imagePoint(page,500,250);
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...moved[1],x:moved[1].x+20,y:moved[1].y+16}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const after=await imagePoint(page,500,250);
  expect(after.x-before.x).toBeCloseTo(20,0);expect(after.y-before.y).toBeCloseTo(16,0);
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(0);
});

test('canceling a pinch restores its starting view and leaves no cover draft',async({page})=>{
  await loadImage(page);await page.locator('#viewZoomIn').click();
  const before=await state(page),center=await imagePoint(page,500,250),x=Math.round(center.x),y=Math.round(center.y);
  const client=await touchClient(page);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-24,y,id:1},{x:x+24,y,id:2}]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-55,y,id:1},{x:x+55,y,id:2}]});
  await expect.poll(async()=>(await state(page)).zoom).toBeGreaterThan(before.zoom);
  await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  expect(await state(page)).toEqual(before);
  await expect(page.locator('#maskSvg .mask-rect,#maskSvg .mask-draft')).toHaveCount(0);
});

test('studying can pan from a covered answer without revealing it, then reveal on a tap',async({page})=>{
  await loadImage(page);
  const a=await imagePoint(page,350,180),b=await imagePoint(page,650,320);
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y);await page.mouse.up();
  await page.locator('#studyButton').click();
  for(let index=0;index<6;index++)await page.locator('#viewZoomIn').click();
  const before=await imagePoint(page,500,250);
  await page.mouse.move(before.x,before.y);await page.mouse.down();await page.mouse.move(before.x+24,before.y+18,{steps:3});await page.mouse.up();
  const after=await imagePoint(page,500,250);
  expect(after.x-before.x).toBeCloseTo(24,0);expect(after.y-before.y).toBeCloseTo(18,0);
  await expect(page.locator('#confirmedCount')).toHaveText('0');
  await page.mouse.click(after.x,after.y);
  await expect(page.locator('#confirmedCount')).toHaveText('1');
});

test('exported lessons align covers with small images at both viewport orientations',async({page,context},testInfo)=>{
  await loadImage(page,{width:100,height:50});
  const a=await imagePoint(page,25,15),b=await imagePoint(page,75,35);
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y);await page.mouse.up();
  await page.locator('#saveButton').click();
  const downloadPromise=page.waitForEvent('download');await page.locator('#downloadHtmlButton').click();
  const download=await downloadPromise,lessonPath=testInfo.outputPath('small-image.reveal.html');await download.saveAs(lessonPath);
  const lesson=await context.newPage();await lesson.goto(pathToFileURL(lessonPath).href);
  await expect(lesson.locator('#lessonReady')).toBeVisible();
  for(const viewport of [{width:390,height:780},{width:780,height:390}]){
    await lesson.setViewportSize(viewport);
    const alignment=await lesson.evaluate(()=>{
      const image=document.getElementById('previewImage'),svg=document.getElementById('maskSvg'),bounds=image.getBoundingClientRect();
      const fit=Math.min(bounds.width/image.naturalWidth,bounds.height/image.naturalHeight);
      const imagePoint={x:bounds.left+(bounds.width-image.naturalWidth*fit)/2+25*fit,y:bounds.top+(bounds.height-image.naturalHeight*fit)/2+15*fit};
      const point=svg.createSVGPoint();point.x=25;point.y=15;const overlayPoint=point.matrixTransform(svg.getScreenCTM());
      return {dx:overlayPoint.x-imagePoint.x,dy:overlayPoint.y-imagePoint.y};
    });
    expect(alignment.dx).toBeCloseTo(0,0);expect(alignment.dy).toBeCloseTo(0,0);
  }
  await lesson.locator('#lessonQuestionList button').click();
  await expect(lesson.locator('#lessonConfirmedCount')).toHaveText('1');
});
