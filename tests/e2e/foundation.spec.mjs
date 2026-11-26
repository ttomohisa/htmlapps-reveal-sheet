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

test('the start screen shows brief instructions beside the import controls',async({page})=>{
  for(const viewport of [{width:1360,height:900},{width:390,height:844}]){
    await page.setViewportSize(viewport);await openApp(page);
    await expect(page.locator('.brand-name')).toHaveJSProperty('tagName','H1');
    await expect(page.locator('#introDescription')).toContainText('Draw a box');
    await expect(page.locator('#editControls h2, #emptyPreview')).toHaveCount(0);
    await expect(page.locator('#dropZone')).toBeHidden();
    await expect(page.locator('#introDescription')).toBeInViewport();
    await expect(page.locator('#addButton')).toBeInViewport();
    await expect(page.locator('.reveal-nav')).toBeHidden();
    if(viewport.width>767)await expect(page.locator('.local-badge')).toBeVisible();
    else await expect(page.locator('.local-badge')).toBeHidden();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
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


test('T01: the intro disappears after loading an image on desktop and phone',async({page})=>{
  const {imagePath}=await import('../helpers/app.mjs');
  await page.setViewportSize({width:1200,height:800});await openApp(page);
  await page.locator('#languageButton').click();
  await expect(page.locator('#introDescription')).toHaveText('ノートの写真を選んで、隠したい答えを囲んでください。学習中はそこを押すと答えが見えます。');
  await expect(page.locator('.local-badge')).toBeVisible();
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  await expect(page.locator('.page-intro')).toBeHidden();
  await page.setViewportSize({width:390,height:780});
  await expect(page.locator('.page-intro')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('T01: footer is aligned to the header and main content edges',async({page})=>{
  for(const width of [900,1360]){
    await page.setViewportSize({width,height:800});await openApp(page);
    const leftEdges=await page.evaluate(()=>{
      const left=(selector)=>{
        const node=document.querySelector(selector),rect=node.getBoundingClientRect(),style=getComputedStyle(node);
        return rect.left+parseFloat(style.paddingLeft);
      };
      return {header:left('.header-inner'),main:left('.main'),footer:left('body > footer')};
    });
    expect(Math.abs(leftEdges.footer-leftEdges.header)).toBeLessThanOrEqual(1);
    expect(Math.abs(leftEdges.footer-leftEdges.main)).toBeLessThanOrEqual(1);
  }
});

test('T01: import actions are distinct from image options, and local storage is folded by default',async({page})=>{
  await page.setViewportSize({width:1120,height:800});await openApp(page);
  await expect(page.locator('#localDraftDetails')).not.toHaveAttribute('open','');
  await expect(page.locator('#localDraftTitle')).toBeVisible();
  await expect(page.locator('#draftOptIn')).toBeHidden();
  await expect(page.locator('.import-actions #addButton')).toBeVisible();
  await expect(page.locator('.import-actions #cameraButton')).toBeVisible();
  await expect(page.locator('.import-actions #openButton')).toBeVisible();
  await expect(page.locator('#compressImages')).toBeHidden();
  await page.locator('.settings-toggle').click();
  await expect(page.locator('.import-settings .image-compression-control')).toBeVisible();
  await expect(page.locator('.import-settings .cover-color-control')).toBeVisible();
  const buttons=await page.evaluate(()=>({
    primary:getComputedStyle(document.querySelector('#addButton')).backgroundColor,
    open:getComputedStyle(document.querySelector('#openButton')).backgroundColor,
    primaryRow:document.querySelector('#addButton').getBoundingClientRect().top,
    settingsRow:document.querySelector('.import-settings').getBoundingClientRect().top
  }));
  expect(buttons.primary).not.toBe(buttons.open);
  expect(buttons.settingsRow).toBeGreaterThan(buttons.primaryRow);
  await page.locator('#localDraftTitle').click();
  await expect(page.locator('#draftOptIn')).toBeVisible();
  await page.locator('#localDraftTitle').click();
  await expect(page.locator('#draftOptIn')).toBeHidden();
  await page.setViewportSize({width:320,height:600});
  await expect(page.locator('.import-actions #addButton')).toBeVisible();
  await expect(page.locator('.import-actions #cameraButton')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
