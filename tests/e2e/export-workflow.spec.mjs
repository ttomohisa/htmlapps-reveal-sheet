import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';

test('T14: editable save keeps filename rules and reports save start rather than completion',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  await page.locator('#saveButton').click();
  await page.locator('#outputFilename').fill(' CON.reveal.html ');

  const firstPromise=page.waitForEvent('download');
  await page.locator('#downloadJsonButton').click();
  const first=await firstPromise;
  expect(first.suggestedFilename()).toBe('_CON.reveal.json');
  await expect(page.locator('#outputFilename')).toHaveValue('_CON');
  await expect(page.locator('#inputStatus')).toContainText(/保存を開始|Started saving/);
  await expect(page.locator('#inputStatus')).not.toContainText(/保存しました|Saved successfully|completed/i);

  const secondPromise=page.waitForEvent('download');
  await page.locator('#downloadJsonButton').click();
  const second=await secondPromise;
  expect(second.suggestedFilename()).toBe('_CON.reveal.json');
  await expect(page.locator('#pageList button')).toHaveCount(1);
});

test('T14: a language switch in the same turn invalidates an in-progress export before download',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  await page.locator('#saveButton').click();

  let downloads=0;
  page.on('download',()=>downloads++);
  await page.evaluate(()=>{
    document.querySelector('#downloadJsonButton').click();
    document.querySelector('#languageButton').click();
  });
  await expect(page.locator('#downloadJsonButton')).toBeEnabled();
  await expect(page.locator('#inputStatus')).toContainText(/破棄|discarded/i);
  expect(downloads).toBe(0);
  await expect(page.locator('#pageList button')).toHaveCount(1);
});

test('T14: Blob preparation failure keeps the sheet and the user can retry',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  await page.locator('#saveButton').click();

  await page.evaluate(()=>{
    window.__RevealOriginalBlob=window.Blob;
    const Original=window.Blob;
    window.Blob=class extends Original{
      constructor(parts,options){
        if(String(options?.type||'').startsWith('application/json'))throw new Error('synthetic Blob failure');
        super(parts,options);
      }
    };
  });
  await page.locator('#downloadJsonButton').click();
  await expect(page.locator('#inputStatus')).toContainText(/準備できません|Could not prepare/i);
  await expect(page.locator('#pageList button')).toHaveCount(1);

  await page.evaluate(()=>{window.Blob=window.__RevealOriginalBlob;delete window.__RevealOriginalBlob;});
  const retryPromise=page.waitForEvent('download');
  await page.locator('#downloadJsonButton').click();
  const retry=await retryPromise;
  expect(retry.suggestedFilename()).toMatch(/\.reveal\.json$/);
  await expect(page.locator('#inputStatus')).toContainText(/保存を開始|Started saving/);
});
