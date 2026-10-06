import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {openApp} from '../helpers/app.mjs';

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
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme)).toBe('light');
  expect(await page.locator('#languageButton').evaluate(node=>{const s=getComputedStyle(node);return s.visibility!=='hidden'&&s.display!=='none';})).toBe(true);
});
