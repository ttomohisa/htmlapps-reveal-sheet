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

test('T01: compact intro replaces the hero heading and hides the privacy badge only on phones',async({page})=>{
 await page.setViewportSize({width:1360,height:780});await openApp(page);
 await expect(page.locator('.brand-name')).toHaveJSProperty('tagName','H1');
 await expect(page.locator('#heroTitle')).toHaveCount(0);
 await expect(page.locator('#introDescription')).toContainText('Create a study sheet from diagrams or notes');
 await expect(page.locator('.local-badge')).toBeVisible();
 await page.locator('#languageButton').click();
 await expect(page.locator('#introDescription')).toHaveText('図やノートの画像に覆いを置き、答えをめくって覚える暗記シートを作れます。まず画像を追加してください。');
 await expect(page.locator('.local-badge')).toContainText('完全ローカル処理');
 const desktop=await page.evaluate(()=>{
   const header=document.querySelector('.header-inner').getBoundingClientRect(),main=document.querySelector('.main').getBoundingClientRect(),mark=document.querySelector('.brand-mark').getBoundingClientRect(),intro=document.querySelector('.page-intro').getBoundingClientRect(),badge=document.querySelector('.local-badge').getBoundingClientRect(),description=document.querySelector('#introDescription').getBoundingClientRect();
   return {headerWidth:header.width,mainWidth:main.width,markWidth:mark.width,markHeight:mark.height,introRight:intro.right,badgeRight:badge.right,badgeLeft:badge.left,descriptionRight:description.right,introDisplay:getComputedStyle(document.querySelector('.page-intro')).display};
 });
 expect(desktop.headerWidth).toBeCloseTo(1120,0);expect(desktop.mainWidth).toBeCloseTo(1120,0);
 expect(desktop.markWidth).toBeCloseTo(38,0);expect(desktop.markHeight).toBeCloseTo(38,0);
 expect(desktop.introDisplay).toBe('flex');expect(desktop.badgeLeft).toBeGreaterThan(desktop.descriptionRight);
 expect(desktop.badgeRight).toBeLessThanOrEqual(desktop.introRight+1);
 await page.setViewportSize({width:390,height:780});
 await expect(page.locator('#introDescription')).toBeVisible();
 await expect(page.locator('.local-badge')).toBeHidden();
 expect(await page.locator('.page-intro').evaluate(node=>getComputedStyle(node).flexDirection)).toBe('column');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#languageButton').click();
 await expect(page.locator('#introDescription')).toContainText('Create a study sheet');
 await expect(page.locator('.local-badge')).toBeHidden();
 await page.setViewportSize({width:768,height:780});
 await expect(page.locator('.local-badge')).toBeVisible();
});

test('T01: workspace cards are understated without hiding active page state',async({page})=>{
 const {imagePath}=await import('../helpers/app.mjs');
 await page.setViewportSize({width:1120,height:800});await openApp(page);
 await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
 await expect(page.locator('.page-item')).toHaveCount(1);
 const card=page.locator('.page-item').first();
 const appearance=await card.evaluate(el=>({shadow:getComputedStyle(el).boxShadow,radius:getComputedStyle(el).borderRadius,selected:el.getAttribute('aria-current')}));
 expect(appearance.shadow).not.toContain('rgba');
 expect(appearance.selected).toBe('page');
 expect(parseFloat(appearance.radius)).toBeLessThanOrEqual(10);
 await page.setViewportSize({width:390,height:760});
 await expect(page.locator('.local-badge')).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test('T01: obsolete development capability sentence is absent from the app frame',async({page})=>{
 await openApp(page);await page.locator('#languageButton').click();await expect(page.locator('#developmentNote')).toHaveCount(0);expect(await page.locator('body').innerText()).not.toContain('編集・学習・教材HTMLに加え');
});
