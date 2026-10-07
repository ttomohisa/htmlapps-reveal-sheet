import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {openApp,imagePath} from '../helpers/app.mjs';

async function imagePoint(page,x,y){return page.locator('#maskSvg').evaluate((svg,point)=>{const p=svg.createSVGPoint();p.x=point.x;p.y=point.y;const out=p.matrixTransform(svg.getScreenCTM());return{x:out.x,y:out.y};},{x,y});}
async function addCover(page){await page.locator('#maskSvg').scrollIntoViewIfNeeded();const a=await imagePoint(page,16,16),b=await imagePoint(page,58,38);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y);await page.mouse.up();await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);}

function guidedFixture(){
  const value=JSON.parse(readFileSync('tests/fixtures/sheets/v0.4.0.reveal.json','utf8'));
  value.document.questions[0].prompt='ACCESSIBILITY_PROMPT_4921';
  value.document.questions[0].answer='ACCESSIBILITY_SECRET_4921';
  return value;
}
async function openGuidedFixture(page){
  await openApp(page);
  const value=guidedFixture();
  await page.locator('#sheetInput').setInputFiles({name:'accessible.reveal.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
  await expect(page.locator('#previewImage')).toBeVisible();
  await page.locator('#studyButton').click();await expect(page.locator('#guidedPanel')).toBeVisible();
  return value;
}

test('T16: closed guided answer is absent from visible/accessibility text until reveal',async({page})=>{
  await openGuidedFixture(page);
  await expect(page.locator('#guidedPrompt')).toHaveText('ACCESSIBILITY_PROMPT_4921');
  await expect(page.locator('#guidedAnswerBox')).toBeHidden();
  expect(await page.locator('body').innerText()).not.toContain('ACCESSIBILITY_SECRET_4921');
  const labels=await page.locator('[aria-label]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')).join('\n'));
  expect(labels).not.toContain('ACCESSIBILITY_SECRET_4921');
  await page.locator('#revealCurrentButton').click();
  await expect(page.locator('#guidedAnswer')).toHaveText('ACCESSIBILITY_SECRET_4921');
});

test('T16: language switching localizes accessible labels without changing exported sheet data',async({page})=>{
  const original=await openGuidedFixture(page);
  await page.locator('#createButton').click();await page.locator('#saveButton').click();await expect(page.locator('#downloadJsonButton')).toBeEnabled();
  const firstPromise=page.waitForEvent('download');await page.locator('#downloadJsonButton').click();const first=await firstPromise;const firstData=JSON.parse(readFileSync(await first.path(),'utf8'));
  await page.locator('#languageButton').click();
  await expect(page.locator('#maskSvg')).toHaveAttribute('aria-label','画像上の覆い');
  await page.locator('#saveButton').click();await expect(page.locator('#downloadJsonButton')).toBeEnabled();
  const secondPromise=page.waitForEvent('download');await page.locator('#downloadJsonButton').click();const second=await secondPromise;const secondData=JSON.parse(readFileSync(await second.path(),'utf8'));
  expect(secondData.document.id).toBe(original.document.id);
  expect(secondData.document).toEqual(firstData.document);
});

test('T16: help remains reachable at 320px short height and Escape restores focus',async({page})=>{
  await page.setViewportSize({width:320,height:420});await openApp(page);
  await page.locator('#helpButton').click();await expect(page.locator('#helpDialog')).toBeVisible();
  const body=page.locator('#helpDialog .dialog-body');await body.evaluate(node=>{node.scrollTop=node.scrollHeight;});
  await expect(page.locator('[data-i18n="helpOffline"]')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.keyboard.press('Escape');await expect(page.locator('#helpDialog')).toBeHidden();await expect(page.locator('#helpButton')).toBeFocused();
});

test('T16: forced colors and reduced motion keep selected/mode controls operable',async({page})=>{
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  await openApp(page);
  await expect(page.locator('#languageButton')).toBeVisible();
  expect(await page.evaluate(()=>matchMedia('(forced-colors: active)').matches)).toBe(true);
  expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  expect(await page.locator('#languageButton').evaluate(node=>{const s=getComputedStyle(node);return s.visibility!=='hidden'&&s.display!=='none';})).toBe(true);
  await page.locator('#languageButton').focus();await expect(page.locator('#languageButton')).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test('T16: exported lesson keeps plain-text answer hidden from assistive output until reveal',async({page,context},testInfo)=>{
  await openApp(page);
  const value=guidedFixture();
  await page.locator('#sheetInput').setInputFiles({name:'accessible-lesson.reveal.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
  await expect(page.locator('#previewImage')).toBeVisible();
  await page.locator('#saveButton').click();await expect(page.locator('#downloadHtmlButton')).toBeEnabled();
  const downloadPromise=page.waitForEvent('download');await page.locator('#downloadHtmlButton').click();const download=await downloadPromise;
  const lessonPath=testInfo.outputPath('accessible-lesson.reveal.html');await download.saveAs(lessonPath);

  const lesson=await context.newPage();await lesson.goto(pathToFileURL(lessonPath).href);await lesson.locator('#lessonReady').waitFor({state:'visible'});
  await expect(lesson.locator('#lessonGuidedPanel')).toBeVisible();
  await expect(lesson.locator('#lessonPrompt')).toHaveText('ACCESSIBILITY_PROMPT_4921');
  await expect(lesson.locator('#lessonAnswerBox')).toBeHidden();
  expect(await lesson.locator('body').innerText()).not.toContain('ACCESSIBILITY_SECRET_4921');
  const labels=await lesson.locator('[aria-label]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')).join('\n'));
  expect(labels).not.toContain('ACCESSIBILITY_SECRET_4921');

  await lesson.locator('#lessonRevealCurrent').click();
  await expect(lesson.locator('#lessonAnswer')).toHaveText('ACCESSIBILITY_SECRET_4921');
  await lesson.locator('#lessonLanguage').click();
  await expect(lesson.locator('#lessonHelpButton')).toHaveAttribute('aria-label',/使い方|注意/);
  await expect(lesson.locator('#lessonPages')).toHaveAttribute('aria-label','ページ');
});


test('T16: optional author text is editable and obeys reveal/accessibility timing',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
  const pageCard=page.locator('#pageList .page-item[aria-current="page"]');await pageCard.locator('.page-description-summary').click();await pageCard.locator('.page-card-description-input').fill('PAGE_CONTEXT_731');await pageCard.locator('.page-card-description-input').blur();
  await addCover(page);
  await expect(page.locator('#questionTextPanel')).toBeVisible();await expect(page.locator('[data-i18n="questionEditorTitle"]')).toBeVisible();
  await page.locator('#questionPromptInput').fill('AUTHOR_PROMPT_731');await page.locator('#questionPromptInput').blur();
  await page.locator('#questionAnswerInput').fill('AUTHOR_SECRET_731');await page.locator('#questionAnswerInput').blur();

  await page.locator('#studyButton').click();
  await expect(page.locator('#studyPageDescription')).toHaveText('PAGE_CONTEXT_731');
  await page.locator('#guidedModeButton').click();
  if(await page.locator('#appConfirmDialog').isVisible()){await page.locator('#appConfirmOk').click();}
  await expect(page.locator('#guidedPrompt')).toHaveText('AUTHOR_PROMPT_731');
  await expect(page.locator('#guidedAnswerBox')).toBeHidden();
  expect(await page.locator('body').innerText()).not.toContain('AUTHOR_SECRET_731');
  await page.locator('#revealCurrentButton').click();
  await expect(page.locator('#guidedAnswer')).toHaveText('AUTHOR_SECRET_731');
});
