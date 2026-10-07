import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {openApp} from '../helpers/app.mjs';

test('T19: old editable JSON can be edited, exported as v1 lesson HTML and safely re-imported',async({page},testInfo)=>{
 await openApp(page);await expect(page.locator('body')).toContainText('v1.0.0');
 const oldPath=resolve('tests/fixtures/sheets/v0.2.0.reveal.json');
 await page.locator('#sheetInput').setInputFiles(oldPath);await expect(page.locator('#pageList .page-item')).toHaveCount(1);
 const title=page.locator('#pageList .page-item').first().locator('.page-card-title');
 await title.fill('Edited in v1.0.0');await title.press('Enter');
 await page.locator('#saveButton').click();await expect(page.locator('#downloadHtmlButton')).toBeEnabled();
 const dl=page.waitForEvent('download');await page.locator('#downloadHtmlButton').click();const download=await dl;
 const lessonPath=testInfo.outputPath('compat.reveal.html');await download.saveAs(lessonPath);
 const html=readFileSync(lessonPath,'utf8');expect(html).toContain('"appVersion":"1.0.0"');expect(html).toContain('"schemaVersion":1');
 await page.locator('#createButton').click();await page.locator('#newButton').click();await page.locator('#appConfirmOk').click();
 await expect(page.locator('#pageList .page-item')).toHaveCount(0);
 await page.locator('#sheetInput').setInputFiles(lessonPath);
 await expect(page.locator('#pageList .page-item')).toHaveCount(1);
 await expect(page.locator('#pageList .page-item').first().locator('.page-card-title')).toHaveValue('Edited in v1.0.0');
 await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
});
