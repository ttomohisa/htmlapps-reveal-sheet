import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {openApp} from '../helpers/app.mjs';
function fixture(){return JSON.parse(readFileSync('tests/fixtures/sheets/question-editing.reveal.json','utf8'));}
async function load(page){await openApp(page);await page.locator('#sheetInput').setInputFiles({name:'editing-qa.reveal.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture()))});await expect(page.locator('#previewImage')).toBeVisible();}
async function select(page,id){await page.locator('#maskSvg .mask-rect[data-mask-id="'+id+'"]').click();}
async function saveJson(page){await page.locator('#saveButton').click();await page.locator('#outputFilename').fill(' qa/question-order ');const event=page.waitForEvent('download');await page.locator('#downloadJsonButton').click();const file=await event;expect(file.suggestedFilename()).toBe('qa_question-order.reveal.json');return {file:await file.path(),data:JSON.parse(readFileSync(await file.path(),'utf8'))};}

test('question reorder preserves groups through Undo, JSON reload and a lesson export',async({page,context},testInfo)=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await load(page);await select(page,'m1');
 await expect(page.locator('#questionOrderPosition')).toContainText('1 / 3');await expect(page.locator('#questionEarlierButton')).toBeDisabled();
 await page.locator('#questionLaterButton').click();await expect(page.locator('#questionOrderPosition')).toContainText('2 / 3');
 await page.locator('#undoButton').click();await expect(page.locator('#inputStatus')).toContainText('Undid the previous edit.');await expect(page.locator('#questionOrderPosition')).toContainText('1 / 3');
 await page.locator('#redoButton').click();await expect(page.locator('#questionOrderPosition')).toContainText('2 / 3');
 await page.locator('#questionLaterButton').click();await expect(page.locator('#questionLaterButton')).toBeDisabled();
 const saved=await saveJson(page);expect(saved.data.document.pages[0].questionOrder).toEqual(['q2','q3','q1']);expect(saved.data.document.questions[0].maskIds).toEqual(['m1','m2']);
 await page.reload();await page.locator('#addButton').waitFor();await page.locator('#sheetInput').setInputFiles(saved.file);await expect(page.locator('#previewImage')).toBeVisible();
 await page.locator('#studyButton').click();await page.locator('#guidedModeButton').click();await expect(page.locator('#guidedPrompt')).toHaveText('Third part');
 await page.locator('#saveButton').click();const event=page.waitForEvent('download');await page.locator('#downloadHtmlButton').click();const lesson=await event;const lessonPath=testInfo.outputPath('question-order.reveal.html');await lesson.saveAs(lessonPath);
 const lessonPage=await context.newPage();await lessonPage.goto(pathToFileURL(lessonPath).href);await expect(lessonPage.locator('#lessonReady')).toBeVisible();await expect(lessonPage.locator('#lessonLanguage')).toHaveAttribute('title','Switch to Japanese');await lessonPage.locator('#lessonLanguage').click();await expect(lessonPage.locator('#lessonLanguage')).toHaveAttribute('title','英語に切り替え');await lessonPage.locator('#lessonLanguage').click();
 await lessonPage.locator('#lessonGuidedMode').click();await expect(lessonPage.locator('#lessonPrompt')).toHaveText('Third part');expect(errors).toEqual([]);
});
test('on-canvas duplicate preserves grouped text and auxiliary kind without page errors',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await load(page);await select(page,'m1');await page.locator('[data-mask-action="duplicate"]').click();
 await expect(page.locator('#coverList button')).toHaveCount(7);await expect(page.locator('#questionCountEdit')).toHaveText('4');
 await select(page,'m5');await page.locator('[data-mask-action="duplicate"]').click();await expect(page.locator('#coverList button')).toHaveCount(8);await expect(page.locator('#questionCountEdit')).toHaveText('4');
 const {data}=await saveJson(page),copy=data.document.questions.find(q=>!['q1','q2','q3'].includes(q.id));
 expect(copy).toMatchObject({prompt:'Name both parts',answer:'Alpha / ベータ'});expect(copy.maskIds).toHaveLength(2);expect(data.document.masks.filter(m=>m.kind==='auxiliary')).toHaveLength(2);expect(errors).toEqual([]);
});
test('language switches name their destination in the current UI language',async({page})=>{
 await openApp(page);await expect(page.locator('#draftSaveStatus')).toContainText('On-device saving is off');await expect(page.locator('#studySaveStatus')).toContainText('Study progress saving is off');await expect(page.locator('#languageButton')).toHaveText('JA');await expect(page.locator('#languageButton')).toHaveAttribute('title','Switch to Japanese');
 await page.locator('#languageButton').click();await expect(page.locator('#languageButton')).toHaveText('EN');await expect(page.locator('#languageButton')).toHaveAttribute('title','英語に切り替え');await expect(page.locator('#helpButton')).toHaveAttribute('title','使い方と注意事項');await expect(page.locator('#draftSaveStatus')).toContainText('端末内保存はOFF');await expect(page.locator('#studySaveStatus')).toContainText('学習記録はOFF');
 await page.locator('#languageButton').click();await expect(page.locator('#draftSaveStatus')).toContainText('On-device saving is off');await expect(page.locator('#studySaveStatus')).toContainText('Study progress saving is off');
});


test('duplicating a group beyond the page limit reports the limit without changing the sheet',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));await openApp(page);
 const value=fixture(),doc=value.document;
 for(let index=doc.masks.length;index<199;index++){
  const id='limit'+index,qid='question'+index;doc.masks.push({id,pageId:'p1',kind:'answer',questionId:qid,rect:{x:.1,y:.65,w:.1,h:.1}});
  doc.questions.push({id:qid,pageId:'p1',revision:1,maskIds:[id],prompt:'',answer:''});doc.pages[0].questionOrder.push(qid);
 }
 await page.locator('#sheetInput').setInputFiles({name:'limit.reveal.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
 await expect(page.locator('#previewImage')).toBeVisible();await page.locator('#coverList button').first().click();
 await page.locator('[data-mask-action="duplicate"]').press('Enter');
 await expect(page.locator('#inputStatus')).toContainText(/limit|上限/);await expect(page.locator('#coverList button')).toHaveCount(199);
 await expect(page.locator('#undoButton')).toBeDisabled();await expect(page.locator('#coverList button').first()).toHaveAttribute('aria-pressed','true');
 const saved=await saveJson(page);expect(saved.data.document).toEqual(doc);expect(errors).toEqual([]);
});
