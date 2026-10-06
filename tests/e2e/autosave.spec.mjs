import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';

async function enableDraft(page){
  await page.locator('#draftOptIn').check();
  await expect(page.locator('#appConfirmDialog')).toBeVisible();
  await page.locator('#appConfirmOk').click();
  await expect(page.locator('#draftOptIn')).toBeChecked();
}
async function addOne(page){await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();}
async function savedGeneration(page){return page.evaluate(async()=>new Promise((resolve,reject)=>{const r=indexedDB.open('reveal-sheet',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('draft','readonly'),g=tx.objectStore('draft').get('current');g.onsuccess=()=>{resolve(g.result?.generation||0);db.close();};g.onerror=()=>reject(g.error);};}));}

test('T09: local draft starts off, saves only after consent, and can be restored after reload',async({page})=>{
  await openApp(page);
  await expect(page.locator('#draftOptIn')).not.toBeChecked();
  await addOne(page);await page.waitForTimeout(1200);expect(await savedGeneration(page)).toBe(0);
  await enableDraft(page);
  await expect(page.locator('#draftSaveStatus')).toContainText(/Saved|保存しました/i,{timeout:5000});
  expect(await savedGeneration(page)).toBe(1);
  await page.reload();await page.locator('#addButton').waitFor({state:'visible'});
  await expect(page.locator('#appConfirmDialog')).toBeVisible();
  await expect(page.locator('#appConfirmMessage')).toContainText(/resume|再開/i);
  await page.locator('#appConfirmOk').click();
  await expect(page.locator('#pageList button')).toHaveCount(1);await expect(page.locator('#previewImage')).toBeVisible();
});

test('T09: confirmed edits debounce into one newer generation',async({page})=>{
  await openApp(page);await enableDraft(page);await addOne(page);
  await expect(page.locator('#draftSaveStatus')).toContainText(/Saved|保存しました/i,{timeout:5000});const before=await savedGeneration(page);
  await page.locator('#pageTitleInput').fill('A');await page.locator('#pageTitleInput').press('Enter');
  await page.locator('#pageTitleInput').fill('B');await page.locator('#pageTitleInput').press('Enter');
  await page.locator('#pageTitleInput').fill('C');await page.locator('#pageTitleInput').press('Enter');
  await page.waitForTimeout(300);expect(await savedGeneration(page)).toBe(before);
  await expect.poll(()=>savedGeneration(page),{timeout:5000}).toBe(before+1);
});

test('T09: a stale second tab stops autosave on generation conflict without losing manual save',async({page,context})=>{
  await openApp(page);await enableDraft(page);await addOne(page);await expect(page.locator('#draftSaveStatus')).toContainText(/Saved|保存しました/i,{timeout:5000});
  const second=await context.newPage();await openApp(second);await expect(second.locator('#appConfirmDialog')).toBeVisible();await second.locator('#appConfirmOk').click();await expect(second.locator('#pageList button')).toHaveCount(1);
  await page.locator('#pageTitleInput').fill('First tab');await page.locator('#pageTitleInput').press('Enter');await expect.poll(()=>savedGeneration(page),{timeout:5000}).toBe(2);
  await second.locator('#pageTitleInput').fill('Second tab');await second.locator('#pageTitleInput').press('Enter');
  await expect(second.locator('#draftConflict')).toBeVisible({timeout:5000});await expect(second.locator('#draftSaveStatus')).toContainText(/another tab|別タブ/i);
  await expect(second.locator('#resolveConflictSaveButton')).toBeVisible();await expect(second.locator('#resolveConflictReloadButton')).toBeVisible();
  await second.locator('#resolveConflictSaveButton').click();await expect(second.locator('#savePanel')).toBeVisible();
});
