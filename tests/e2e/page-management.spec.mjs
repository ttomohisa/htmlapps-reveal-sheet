import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';

test('T05: rename, move and delete pages without drag, then Undo deletion',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles([imagePath('static.png'),imagePath('static.jpg'),imagePath('static.webp')]);
  await expect(page.locator('#pageList button')).toHaveCount(3);

  await page.locator('#pageList button').nth(1).click();
  await page.locator('#pageTitleInput').fill('Middle page');
  await page.locator('#pageTitleInput').press('Enter');
  await expect(page.locator('#pageList button').nth(1)).toContainText('Middle page');

  await page.locator('#pageNextButton').click();
  await expect(page.locator('#pageList button').nth(2)).toContainText('Middle page');
  await page.locator('#pagePrevButton').click();
  await expect(page.locator('#pageList button').nth(1)).toContainText('Middle page');

  await page.locator('#pageDeleteButton').click();
  await expect(page.locator('#appConfirmDialog')).toBeVisible();
  await page.locator('#appConfirmCancel').click();
  await expect(page.locator('#pageList button')).toHaveCount(3);

  await page.locator('#pageDeleteButton').click();
  await page.locator('#appConfirmOk').click();
  await expect(page.locator('#pageList button')).toHaveCount(2);
  await page.locator('#undoButton').click();
  await expect(page.locator('#pageList button')).toHaveCount(3);
  await expect(page.locator('#pageList')).toContainText('Middle page');
});

test('T05: deleting the last page returns to a true empty state and Undo restores it',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#pageList button')).toHaveCount(1);
  await page.locator('#pageDeleteButton').click();await page.locator('#appConfirmOk').click();
  await expect(page.locator('#pageList button')).toHaveCount(0);
  await expect(page.locator('#previewImage')).toBeHidden();
  await expect(page.locator('#emptyPreview')).toBeVisible();
  await page.locator('#undoButton').click();
  await expect(page.locator('#pageList button')).toHaveCount(1);
  await expect(page.locator('#previewImage')).toBeVisible();
});
