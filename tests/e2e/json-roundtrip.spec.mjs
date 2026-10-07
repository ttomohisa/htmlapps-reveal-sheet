import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {openApp,imagePath} from '../helpers/app.mjs';
const currentAppVersion=JSON.parse(readFileSync('app.config.json','utf8')).version;

async function imagePoint(page,x,y){
  return page.locator('#maskSvg').evaluate((svg,point)=>{
    const p=svg.createSVGPoint();p.x=point.x;p.y=point.y;
    const out=p.matrixTransform(svg.getScreenCTM());
    return {x:out.x,y:out.y};
  },{x,y});
}
async function addOneCover(page){
  const a=await imagePoint(page,24,20),b=await imagePoint(page,60,42);
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y);await page.mouse.up();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
}

test('T04: save image-embedded editable JSON and reopen without choosing the image again',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  await addOneCover(page);
  await expect(page.locator('#saveButton')).toBeEnabled();

  await page.locator('#saveButton').click();
  await expect(page.locator('#savePanel')).toBeVisible();
  await page.locator('#outputFilename').fill(' study/test ');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#downloadJsonButton').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('study_test.reveal.json');
  const downloadedPath=await download.path();
  const saved=JSON.parse(readFileSync(downloadedPath,'utf8'));
  expect(saved).toMatchObject({format:'reveal-sheet',schemaVersion:1,appVersion:currentAppVersion,kind:'editable'});
  expect(saved.document.pages).toHaveLength(1);
  expect(saved.document.assets).toHaveLength(1);
  expect(saved.document.masks).toHaveLength(1);
  expect(saved.document.questions).toHaveLength(1);
  expect(saved.document.assets[0].dataBase64.length).toBeGreaterThan(100);
  expect('ratings' in saved.document).toBe(false);

  await page.locator('#createButton').click();
  await page.locator('#newButton').click();await page.locator('#appConfirmOk').click();
  await expect(page.locator('#pageList .page-item')).toHaveCount(0);

  await page.locator('#sheetInput').setInputFiles(downloadedPath);
  await expect(page.locator('#pageList .page-item')).toHaveCount(1);
  await expect(page.locator('#previewImage')).toBeVisible();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
  await expect(page.locator('#studyButton')).toBeEnabled();
});

test('T04: invalid editable JSON leaves the current sheet intact',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#pageList .page-item')).toHaveCount(1);
  await page.locator('#sheetInput').setInputFiles({name:'broken.reveal.json',mimeType:'application/json',buffer:Buffer.from('{"format":"reveal-sheet","schemaVersion":1}')});
  await expect(page.locator('#pageList .page-item')).toHaveCount(1);
  await expect(page.locator('#inputStatus')).toContainText(/could not|開けません|invalid/i);
  await expect(page.locator('#previewImage')).toBeVisible();
});

test('T04: a valid replacement is confirmed only after validation',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#pageList .page-item')).toHaveCount(1);

  const requests=[];page.on('request',request=>{if(/^https?:/i.test(request.url()))requests.push(request.url());});
  const png=readFileSync(imagePath('static.png'));
  const value={
    format:'reveal-sheet',schemaVersion:1,appVersion:'0.2.0',kind:'editable',
    document:{id:'document_imported',revision:1,title:'Imported sheet',defaults:{mode:'free',otherAnswers:'hidden'},
      pages:[{id:'page_imported',title:'Imported page',description:'',imageId:'image_imported',questionOrder:[]}],
      assets:[{id:'image_imported',mime:'image/png',width:120,height:80,byteLength:png.length,dataBase64:png.toString('base64')}],
      questions:[],masks:[]}
  };
  await page.locator('#sheetInput').setInputFiles({name:'valid.reveal.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
  await expect(page.locator('#appConfirmDialog')).toBeVisible();
  await page.locator('#appConfirmCancel').click();
  await expect(page.locator('#sheetTitle')).toHaveText('Untitled sheet');

  await page.locator('#sheetInput').setInputFiles({name:'valid.reveal.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
  await page.locator('#appConfirmOk').click();
  await expect(page.locator('#sheetTitle')).toHaveText('Imported sheet');
  await expect(page.locator('#pageList .page-item')).toContainText('Imported page');
  expect(requests).toEqual([]);
});
