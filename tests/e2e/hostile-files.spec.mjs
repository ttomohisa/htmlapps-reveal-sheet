import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {openApp,imagePath} from '../helpers/app.mjs';

function editableFixture(){
  return JSON.parse(readFileSync('tests/fixtures/sheets/v0.2.0.reveal.json','utf8'));
}
async function seedCurrentSheet(page){
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  await expect(page.locator('#pageList .page-item')).toHaveCount(1);
}
async function expectRejectedAndPreserved(page){
  await expect(page.locator('#appConfirmDialog')).toBeHidden();
  await expect(page.locator('#inputStatus')).toContainText(/開けません|could not open|newer|新しい/i);
  await expect(page.locator('#pageList .page-item')).toHaveCount(1);
  await expect(page.locator('#previewImage')).toBeVisible();
}

test('T13: invalid UTF-8 and excessive JSON depth are rejected without replacing the current sheet',async({page})=>{
  await seedCurrentSheet(page);

  await page.locator('#sheetInput').setInputFiles({
    name:'invalid-utf8.reveal.json',mimeType:'application/json',buffer:Buffer.from([0x7b,0x22,0x61,0x22,0x3a,0xc3,0x28,0x7d])
  });
  await expectRejectedAndPreserved(page);

  const nested='['.repeat(17)+'0'+']'.repeat(17);
  await page.locator('#sheetInput').setInputFiles({
    name:'too-deep.reveal.json',mimeType:'application/json',buffer:Buffer.from(nested)
  });
  await expectRejectedAndPreserved(page);
});

test('T13: structural pollution keys and future schema are rejected atomically',async({page})=>{
  await seedCurrentSheet(page);

  const polluted=editableFixture();
  Object.defineProperty(polluted.document.pages[0],'__proto__',{value:{polluted:true},enumerable:true});
  await page.locator('#sheetInput').setInputFiles({
    name:'polluted.reveal.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(polluted))
  });
  await expectRejectedAndPreserved(page);

  const future=editableFixture();future.schemaVersion=2;
  await page.locator('#sheetInput').setInputFiles({
    name:'future.reveal.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(future))
  });
  await expectRejectedAndPreserved(page);
});

test('T13: an APNG disguised as a stored PNG is rejected before replacement',async({page})=>{
  await seedCurrentSheet(page);
  const value=editableFixture(),animated=readFileSync(imagePath('animated.png'));
  value.document.assets[0]={
    ...value.document.assets[0],
    width:120,height:80,byteLength:animated.length,dataBase64:animated.toString('base64')
  };
  await page.locator('#sheetInput').setInputFiles({
    name:'animated-stored.reveal.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))
  });
  await expectRejectedAndPreserved(page);
});


test('T13: an older schema-v1 guided fixture opens without losing its study defaults',async({page})=>{
  await seedCurrentSheet(page);
  await page.locator('#sheetInput').setInputFiles(resolve('tests/fixtures/sheets/v0.4.0.reveal.json'));
  await expect(page.locator('#appConfirmDialog')).toBeVisible();
  await page.locator('#appConfirmOk').click();
  await expect(page.locator('#pageList .page-item')).toHaveCount(1);
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
  await page.locator('#studyButton').click();
  await expect(page.locator('#guidedPanel')).toBeVisible();
  await expect(page.locator('#otherAnswersVisible')).toBeChecked();
});
