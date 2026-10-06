import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {openApp,imagePath} from '../helpers/app.mjs';

async function imagePoint(page,x,y){return page.locator('#maskSvg').evaluate((svg,point)=>{const p=svg.createSVGPoint();p.x=point.x;p.y=point.y;const out=p.matrixTransform(svg.getScreenCTM());return{x:out.x,y:out.y};},{x,y});}
async function addCover(page,a,b){await page.locator('#coverButton').click();const p1=await imagePoint(page,...a),p2=await imagePoint(page,...b);await page.mouse.move(p1.x,p1.y);await page.mouse.down();await page.mouse.move(p2.x,p2.y);await page.mouse.up();}

test('T11: exported lesson opens directly and studies without additional network access',async({page,context})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
  await addCover(page,[10,10],[32,28]);await addCover(page,[48,10],[70,28]);
  await page.locator('#saveButton').click();await expect(page.locator('#savePanel')).toBeVisible();
  await page.locator('#outputFilename').fill(' portable lesson ');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#downloadHtmlButton').click();
  const download=await downloadPromise,lessonPath=await download.path();
  expect(download.suggestedFilename()).toBe('portable lesson.reveal.html');
  const html=readFileSync(lessonPath,'utf8');
  expect((html.match(/id="reveal-sheet-data"/g)||[]).length).toBe(1);
  expect(html).toContain('"kind":"lesson"');expect(html).not.toContain('"ratings"');

  const lesson=await context.newPage(),requests=[];lesson.on('request',request=>{if(/^https?:/i.test(request.url()))requests.push(request.url());});
  await lesson.goto(pathToFileURL(lessonPath).href);
  await lesson.locator('#lessonReady').waitFor({state:'visible'});
  expect(requests).toEqual([]);
  await expect(lesson.locator('#coverButton')).toHaveCount(0);
  await expect(lesson.locator('#lessonQuestionList button')).toHaveCount(2);
  await lesson.locator('#lessonQuestionList button').first().click();
  await expect(lesson.locator('#lessonConfirmedCount')).toHaveText('1');

  await lesson.locator('#lessonGuidedMode').click();
  await expect(lesson.locator('#lessonGuidedPanel')).toBeVisible();
  await expect(lesson.locator('#lessonRecalled')).toBeDisabled();
  await lesson.locator('#lessonRevealCurrent').click();await expect(lesson.locator('#lessonRecalled')).toBeEnabled();
  await lesson.locator('#lessonRecalled').click();await expect(lesson.locator('#lessonGuidedProgress')).toContainText('2 / 2');
  await lesson.locator('#lessonSkip').click();await expect(lesson.locator('#lessonResults')).toBeVisible();
  await expect(lesson.locator('#lessonResultRecalled')).toHaveText('1');await expect(lesson.locator('#lessonResultSkipped')).toHaveText('1');

  await lesson.locator('#lessonFilename').fill('lesson-copy');
  await lesson.locator('#lessonSaveEditableButton').click();await expect(lesson.locator('#lessonConfirmDialog')).toBeVisible();
  const jsonDownload=lesson.waitForEvent('download');await lesson.locator('#lessonConfirmOk').click();const json=await jsonDownload;
  expect(json.suggestedFilename()).toBe('lesson-copy.reveal.json');
  const saved=JSON.parse(readFileSync(await json.path(),'utf8'));expect(saved.kind).toBe('editable');expect('ratings' in saved.document).toBe(false);
});

test('T11: lesson waits for image decode, supports Japanese, and remains usable when storage is unavailable',async({page,context})=>{
  await openApp(page);await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();await addCover(page,[18,18],[52,38]);
  await page.locator('#saveButton').click();const dl=page.waitForEvent('download');await page.locator('#downloadHtmlButton').click();const lessonPath=await (await dl).path();
  const lesson=await context.newPage();
  await lesson.addInitScript(()=>{try{Object.defineProperty(window,'indexedDB',{value:undefined,configurable:true});}catch{}});
  await lesson.goto(pathToFileURL(lessonPath).href);await lesson.locator('#lessonReady').waitFor({state:'visible'});
  await lesson.locator('#lessonLanguage').click();await expect(lesson.locator('#lessonTitle')).toContainText(/教材|暗記/i);
  await expect(lesson.locator('#lessonStudyOptIn')).toBeDisabled();
  await expect(lesson.locator('#maskSvg .mask-rect')).toHaveCount(1);
});
