import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {openApp} from '../helpers/app.mjs';

async function syntheticPhoto(page){
  const url=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=880;canvas.height=600;
    const ctx=canvas.getContext('2d');
    const pixels=ctx.createImageData(canvas.width,canvas.height);
    let state=0x842723a3;
    for(let y=0;y<600;y++)for(let x=0;x<880;x++){
      const index=(y*880+x)*4;
      if(x%7===0&&y%7===0)state=(Math.imul(state,1664525)+1013904223)>>>0;
      pixels.data[index]=(state>>>22)+Math.floor(x/35)%40;
      pixels.data[index+1]=(state>>>16&127)+Math.floor(y/40)%40;
      pixels.data[index+2]=(state>>>8&127)+Math.floor(x/32)%30;
      pixels.data[index+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    return canvas.toDataURL('image/jpeg',.92);
  });
  return Buffer.from(url.split(',')[1],'base64');
}
async function addCover(page){
  const pts=await page.locator('#maskSvg').evaluate(svg=>{
    const matrix=svg.getScreenCTM();
    return [[90,80],[270,190]].map(([x,y])=>{
      const pt=svg.createSVGPoint();pt.x=x;pt.y=y;
      const p=pt.matrixTransform(matrix);return {x:p.x,y:p.y};
    });
  });
  await page.mouse.move(pts[0].x,pts[0].y);await page.mouse.down();
  await page.mouse.move(pts[1].x,pts[1].y,{steps:6});await page.mouse.up();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
}
test('T02/T11: default WebP saves schema v2 in both JSON and offline lesson HTML',async({page,context},testInfo)=>{
  await openApp(page);
  const photo=await syntheticPhoto(page);
  await expect(page.locator('#compressImages')).toBeChecked();
  await page.locator('#imageInput').setInputFiles({name:'offline-photo.jpg',mimeType:'image/jpeg',buffer:photo});
  await expect(page.locator('#previewImage')).toBeVisible();
  await expect(page.locator('#imageFormat')).toHaveText('WebP');
  await expect(page.locator('#imageDimensions')).toHaveText('880 × 600 px');
  await addCover(page);
  await page.locator('#saveButton').click();
  const saveJson=page.waitForEvent('download');
  await page.locator('#downloadJsonButton').click();
  const json=await saveJson,jsonFile=testInfo.outputPath('compressed.reveal.json');
  await json.saveAs(jsonFile);
  const document=JSON.parse(readFileSync(jsonFile,'utf8'));
  expect(document.schemaVersion).toBe(2);
  expect(document.document.assets[0].mime).toBe('image/webp');
  expect(document.document.assets[0].byteLength).toBeGreaterThan(0);
  const saveHtml=page.waitForEvent('download');
  await page.locator('#downloadHtmlButton').click();
  const html=await saveHtml,htmlFile=testInfo.outputPath('compressed.reveal.html');
  await html.saveAs(htmlFile);
  const htmlText=readFileSync(htmlFile,'utf8');
  expect(htmlText).toContain('"schemaVersion":2');
  expect(htmlText).toContain('"mime":"image/webp"');
  const player=await context.newPage();
  await player.goto(pathToFileURL(htmlFile).href);
  await expect(player.locator('#lessonReady')).toBeVisible();
  await expect(player.locator('#previewImage')).toBeVisible();
  await expect(player.locator('#previewImage')).toHaveAttribute('src',/^data:image\/webp;base64,/);
  await player.close();

  // A portable WebP lesson must also be editable again, not merely viewable.
  const importedLesson=await context.newPage();await openApp(importedLesson);
  await importedLesson.locator('#sheetInput').setInputFiles(htmlFile);
  await expect(importedLesson.locator('#previewImage')).toBeVisible();
  await expect(importedLesson.locator('#imageFormat')).toHaveText('WebP');
  await expect(importedLesson.locator('#maskSvg .mask-rect')).toHaveCount(1);
  await importedLesson.close();

  const imported=await context.newPage();await openApp(imported);
  await imported.locator('#sheetInput').setInputFiles(jsonFile);
  await expect(imported.locator('#previewImage')).toBeVisible();
  await expect(imported.locator('#imageFormat')).toHaveText('WebP');
  await expect(imported.locator('#maskSvg .mask-rect')).toHaveCount(1);
  await imported.close();
});
test('T02/T04: disabling compression preserves PNG and v1 schema for older clients',async({page},testInfo)=>{
  await openApp(page);
  await page.locator('#compressImages').uncheck();
  await page.locator('#imageInput').setInputFiles({name:'offline-photo.jpg',mimeType:'image/jpeg',buffer:await syntheticPhoto(page)});
  await expect(page.locator('#previewImage')).toBeVisible();
  await expect(page.locator('#imageFormat')).toHaveText('PNG');
  await page.locator('#saveButton').click();
  const download=page.waitForEvent('download');
  await page.locator('#downloadJsonButton').click();
  const file=await download,filename=testInfo.outputPath('legacy.reveal.json');
  await file.saveAs(filename);
  const document=JSON.parse(readFileSync(filename,'utf8'));
  expect(document.schemaVersion).toBe(1);
  expect(document.document.assets[0].mime).toBe('image/png');
  expect(document.document.assets[0].dataBase64).toMatch(/^iVBORw0KGgo/);
});
