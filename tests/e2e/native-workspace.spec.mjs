import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';

async function loadImage(page,viewport={width:390,height:780}){
  await page.setViewportSize(viewport);await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
}
async function drawCover(page){
  const points=await page.locator('#maskSvg').evaluate(svg=>[[24,18],[55,40]].map(([x,y])=>{
    const point=svg.createSVGPoint();point.x=x;point.y=y;const screen=point.matrixTransform(svg.getScreenCTM());return{x:screen.x,y:screen.y};
  }));
  await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();
  await page.mouse.move(points[1].x,points[1].y,{steps:5});await page.mouse.up();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
}

test('native workspace: image, editing dock and navigation fit in one mobile screen',async({page})=>{
  await loadImage(page);
  const stage=await page.locator('#dropZone').boundingBox(),dock=await page.locator('#editModeToolbar').boundingBox(),nav=await page.locator('.reveal-nav').boundingBox();
  expect(stage.height).toBeGreaterThanOrEqual(440);
  expect(dock.y).toBeGreaterThanOrEqual(stage.y+stage.height-1);
  expect(dock.y+dock.height).toBeLessThanOrEqual(nav.y+1);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
  for(const selector of ['#drawModeButton','#panModeButton','#mobileCoversButton','#mobileMoreButton','#mobileUndoButton','#mobileRedoButton']){
    const box=await page.locator(selector).boundingBox();expect(box.width).toBeGreaterThanOrEqual(48);expect(box.height).toBeGreaterThanOrEqual(48);
  }
});

for(const viewport of [{width:320,height:480},{width:700,height:390}]){
  test(`native workspace: all primary controls remain reachable at ${viewport.width}x${viewport.height}`,async({page})=>{
    await loadImage(page,viewport);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
    const nav=await page.locator('.reveal-nav').boundingBox();
    for(const selector of ['#dropZone','#mobilePageToggle','#mobileUndoButton','#editModeToolbar']){
      const box=await page.locator(selector).boundingBox();expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(nav.y+1);
    }
    await page.locator('#mobileMoreButton').click();await expect(page.locator('#editorSheet')).toBeVisible();
    await page.locator('#clearStudyButton').scrollIntoViewIfNeeded();
    const box=await page.locator('#clearStudyButton').boundingBox();expect(box.y+box.height).toBeLessThanOrEqual(viewport.height+1);
    await page.keyboard.press('Escape');await expect(page.locator('#editorSheet')).toBeHidden();
    await expect(page.locator('#mobileMoreButton')).toBeFocused();
  });
}

test('native workspace: pages use a modal carousel without moving the image',async({page})=>{
  await loadImage(page);await page.locator('#imageInput').setInputFiles(imagePath('static.jpg'));
  await expect(page.locator('#pageList .page-item')).toHaveCount(2);
  const before=await page.locator('#dropZone').boundingBox();
  await page.locator('#mobilePageToggle').click();await expect(page.locator('#editorSheet')).toBeVisible();
  await expect(page.locator('#mobilePageToggle')).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#editorSheet #pageList')).toBeVisible();
  await page.locator('#pageList .page-item').first().locator('.page-card-meta').click();
  await expect(page.locator('#editorSheet')).toBeHidden();await expect(page.locator('#mobilePagePosition')).toHaveText('Page 1 of 2');
  const after=await page.locator('#dropZone').boundingBox();expect(after).toEqual(before);
});

test('native workspace: selected cover tools preserve image geometry and Undo',async({page})=>{
  await loadImage(page);const before=await page.locator('#dropZone').boundingBox();await drawCover(page);
  expect(await page.locator('#dropZone').boundingBox()).toEqual(before);
  await page.locator('#maskFineAdjustButton').click();await expect(page.locator('#editorSheet #maskFineControls')).toBeVisible();
  const rect=page.locator('#maskSvg .mask-rect'),x=Number(await rect.getAttribute('x'));
  await page.locator('#maskFineControls [data-mask-direction="right"]').click();
  expect(Number(await rect.getAttribute('x'))).toBeGreaterThan(x);
  await page.locator('#editorSheetClose').click();await page.locator('#mobileUndoButton').click();
  expect(Number(await rect.getAttribute('x'))).toBeCloseTo(x,2);
  await page.locator('#maskQuickDuplicate').click();await expect(rect).toHaveCount(2);
  await page.locator('#mobileCoversButton').click();await expect(page.locator('#editorSheet #coverPanel')).toBeVisible();
  await page.keyboard.press('Escape');expect(await page.locator('#dropZone').boundingBox()).toEqual(before);
});

test('native workspace: tools survive dialog close, language change and desktop resize',async({page})=>{
  await loadImage(page);await page.locator('#mobileMoreButton').click();
  await expect(page.locator('#editorSheet #addButton')).toBeVisible();
  await expect(page.locator('#editorSheet #openButton')).toBeVisible();
  await expect(page.locator('#editorSheet #localDraftPanel')).toBeVisible();
  await page.setViewportSize({width:1200,height:900});
  await expect(page.locator('#editorSheet')).toBeHidden();
  await expect(page.locator('.reveal-shell #editControls')).toBeVisible();
  await expect(page.locator('.reveal-shell #localDraftPanel')).toBeVisible();
  await page.setViewportSize({width:390,height:780});await page.locator('#languageButton').click();
  await expect(page.locator('#panModeButton')).toContainText('画像を動かす');
  await page.locator('#mobileMoreButton').click();await expect(page.locator('#editorSheetTitle')).toHaveText('その他');
  await page.keyboard.press('Escape');await expect(page.locator('#mobileMoreButton')).toBeFocused();
});

test('native workspace: Undo cancels a cover still being drawn by another pointer',async({page})=>{
  await loadImage(page);await drawCover(page);
  const points=await page.locator('#maskSvg').evaluate(svg=>[[70,18],[95,40]].map(([x,y])=>{
    const point=svg.createSVGPoint();point.x=x;point.y=y;const screen=point.matrixTransform(svg.getScreenCTM());return{x:screen.x,y:screen.y};
  }));
  await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();await page.mouse.move(points[1].x,points[1].y);
  await expect(page.locator('#maskSvg .mask-draft')).toHaveCount(1);
  // A second input can activate the visible history action while a pointer
  // still owns the image. Its late release must not commit the old draft.
  await page.locator('#mobileUndoButton').evaluate(button=>button.click());
  await page.mouse.up();
  await expect(page.locator('#maskSvg .mask-draft,#maskSvg .mask-rect')).toHaveCount(0);
});

test('native workspace: short landscape selection never intercepts zoom or editing controls',async({page})=>{
  await loadImage(page);await drawCover(page);await page.setViewportSize({width:568,height:320});
  for(const selector of ['#viewZoomOut','#viewFit','#viewZoomIn','#maskFineAdjustButton','#maskQuickDuplicate','#maskQuickDelete','#drawModeButton','#panModeButton','#mobileCoversButton','#mobileMoreButton']){
    await expect(page.locator(selector)).toBeVisible();
    const ownsTap=await page.locator(selector).evaluate(button=>{
      const box=button.getBoundingClientRect();return button.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2));
    });
    expect(ownsTap,`${selector} must receive its own center tap`).toBe(true);
  }
  await page.locator('#viewZoomIn').click();await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
});
