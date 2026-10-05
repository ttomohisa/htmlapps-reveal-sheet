import {test,expect} from '@playwright/test';
import {openApp} from '../helpers/app.mjs';
for(const width of [320,360,390,768,1360])test(`T01: empty bilingual light UI at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:780});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await openApp(page);
 await expect(page.getByRole('button',{name:'Add images',exact:true})).toBeVisible();
 await expect(page.locator('#studyButton')).toBeDisabled();
 await expect(page.locator('#saveButton')).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#languageButton').click();
 await expect(page.getByRole('button',{name:'画像を追加',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.emulateMedia({colorScheme:'dark'});
 expect(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme)).toBe('light');
 expect(errors).toEqual([]);
});
test('T01: help closes with Escape and restores focus',async({page})=>{
 await openApp(page);await page.locator('#helpButton').click();await expect(page.locator('#helpDialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#helpDialog')).not.toBeVisible();await expect(page.locator('#helpButton')).toBeFocused();
});
test('T01/T02: loaded image begins within the narrow viewport, not below introductions',async({page})=>{
 await page.setViewportSize({width:320,height:800});await openApp(page);
 const {imagePath}=await import('../helpers/app.mjs');await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
 const box=await page.locator('#previewImage').boundingBox();expect(box.y).toBeLessThan(600);
});
