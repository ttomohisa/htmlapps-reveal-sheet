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

test('T01: header and hero follow the current Browser Kitty compact app frame',async({page})=>{
 await page.setViewportSize({width:1360,height:780});await openApp(page);await page.locator('#languageButton').click();
 await expect(page.locator('#heroTitle')).toHaveText('図やノートをめくる教材に');await expect(page.locator('.local-badge')).toContainText('完全ローカル処理');
 const desktop=await page.evaluate(()=>{const header=document.querySelector('.header-inner').getBoundingClientRect(),main=document.querySelector('.main').getBoundingClientRect(),mark=document.querySelector('.brand-mark').getBoundingClientRect(),intro=document.querySelector('.page-intro').getBoundingClientRect(),badge=document.querySelector('.local-badge').getBoundingClientRect(),title=document.querySelector('#heroTitle').getBoundingClientRect(),titleStyle=getComputedStyle(document.querySelector('#heroTitle'));return{headerWidth:header.width,mainWidth:main.width,markWidth:mark.width,markHeight:mark.height,introRight:intro.right,badgeRight:badge.right,badgeLeft:badge.left,titleRight:title.right,titleSize:parseFloat(titleStyle.fontSize),introDisplay:getComputedStyle(document.querySelector('.page-intro')).display};});
 expect(desktop.headerWidth).toBeCloseTo(1120,0);expect(desktop.mainWidth).toBeCloseTo(1120,0);expect(desktop.markWidth).toBeCloseTo(38,0);expect(desktop.markHeight).toBeCloseTo(38,0);expect(desktop.titleSize).toBeLessThanOrEqual(28);expect(desktop.introDisplay).toBe('flex');expect(desktop.badgeLeft).toBeGreaterThan(desktop.titleRight);expect(desktop.badgeRight).toBeLessThanOrEqual(desktop.introRight+1);
 await page.setViewportSize({width:390,height:780});
 expect(await page.locator('.page-intro').evaluate(node=>getComputedStyle(node).display)).toBe('flex');expect(await page.locator('.page-intro').evaluate(node=>getComputedStyle(node).flexDirection)).toBe('column');expect(parseFloat(await page.locator('#heroTitle').evaluate(node=>getComputedStyle(node).fontSize))).toBeLessThanOrEqual(22.1);
});


test('T01: loaded editor removes the obsolete development capability sentence',async({page})=>{
 const {imagePath}=await import('../helpers/app.mjs');await openApp(page);await page.locator('#languageButton').click();await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
 await expect(page.locator('#developmentNote')).toBeHidden();expect(await page.locator('body').innerText()).not.toContain('編集・学習・教材HTMLに加え');
});
