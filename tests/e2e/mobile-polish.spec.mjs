import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';

async function load(page,viewport={width:390,height:780}){
  await page.setViewportSize(viewport);await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
}
async function cover(page,x1,y1,x2,y2){
  const pts=await page.locator('#maskSvg').evaluate((svg,coords)=>coords.map(([x,y])=>{
    const p=svg.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};
  }),[[x1,y1],[x2,y2]]);
  await page.mouse.move(pts[0].x,pts[0].y);await page.mouse.down();
  await page.mouse.move(pts[1].x,pts[1].y,{steps:5});await page.mouse.up();
}
async function startTwoQuestionStudy(page){
  await cover(page,8,10,30,26);await cover(page,48,10,72,26);
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(2);
  await page.locator('#studyButton').click();await page.locator('#guidedModeButton').click();
  await page.locator('#revealCurrentButton').click();await page.locator('#recalledButton').click();
  await expect(page.locator('#guidedProgress')).toContainText('2 / 2');
}

test('study progress survives Create and Save navigation with device saving off',async({page})=>{
  await load(page);await expect(page.locator('#studyOptIn')).not.toBeChecked();
  await startTwoQuestionStudy(page);
  await page.locator('#createButton').click();await expect(page.locator('#editModeToolbar')).toBeVisible();
  await page.locator('#studyButton').click();
  await expect(page.locator('#guidedProgress')).toContainText('2 / 2');
  await expect(page.locator('#guidedQuestionList button').first()).toHaveAttribute('data-rating','recalled');
  await page.locator('#saveButton').click();await expect(page.locator('#savePanel')).toBeVisible();
  await page.locator('#studyButton').click();
  await expect(page.locator('#guidedProgress')).toContainText('2 / 2');
  await expect(page.locator('#guidedQuestionList button').first()).toHaveAttribute('data-rating','recalled');
  await expect(page.locator('#appConfirmDialog')).toBeHidden();
});

test('editing page metadata in Create preserves unrelated study ratings',async({page})=>{
  await load(page);await startTwoQuestionStudy(page);
  await page.locator('#createButton').click();await page.locator('#mobilePageToggle').click();
  const title=page.locator('#editorSheet .page-card-title').first();
  await title.fill('Edited page title');await title.press('Enter');
  await page.keyboard.press('Escape');await expect(page.locator('#editorSheet')).toBeHidden();
  await page.locator('#studyButton').click();
  await expect(page.locator('#guidedProgress')).toContainText('2 / 2');
  await expect(page.locator('#guidedQuestionList button').first()).toHaveAttribute('data-rating','recalled');
});

test('rejected file imports show a visible warning after content is loaded',async({page})=>{
  await load(page);
  await page.locator('#imageInput').setInputFiles({name:'unsupported.gif',mimeType:'image/gif',buffer:Buffer.from('GIF89a','ascii')});
  await expect(page.locator('#appToast')).toHaveClass(/show/);
  await expect(page.locator('#appToast')).toHaveAttribute('data-tone','warning');
  await expect(page.locator('#appToastMessage')).not.toHaveText('');
  await expect(page.locator('#pageList .page-item')).toHaveCount(1);
});

test('validation failures remain visible above an open mobile settings dialog',async({page})=>{
  await load(page);await cover(page,8,8,35,30);
  await page.locator('#mobileCoversButton').click();await expect(page.locator('#editorSheet')).toBeVisible();
  await expect(page.locator('#questionPromptInput')).toBeVisible();
  await page.locator('#questionPromptInput').evaluate(el=>{
    el.value='x'.repeat(40000);el.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await expect(page.locator('#editorSheetAlert')).toBeVisible();
  await expect(page.locator('#editorSheetAlert')).not.toHaveText('');
  await expect(page.locator('#appToast')).toHaveAttribute('data-tone','warning');
});

test('image pan guide appears only at full-image scale and localizes',async({page})=>{
  await load(page,{width:320,height:480});
  await page.locator('#panModeButton').click();
  await expect(page.locator('#panModeHint')).toBeVisible();
  await page.locator('#viewZoomIn').click();
  await expect(page.locator('#panModeHint')).toBeHidden();
  await page.locator('#viewFit').click();
  await expect(page.locator('#panModeHint')).toBeVisible();
  await page.locator('#languageButton').click();
  await expect(page.locator('#panModeHint')).toContainText('拡大');
  await page.locator('#drawModeButton').click();
  await expect(page.locator('#panModeHint')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for(const viewport of [{width:320,height:480},{width:480,height:360},{width:700,height:320}]){
  test(`inline adjust dock stays reachable without dimming at ${viewport.width}×${viewport.height}`,async({page})=>{
    await load(page,viewport);await cover(page,10,10,35,30);
    await page.locator('#maskFineAdjustButton').click();
    await expect(page.locator('#maskFineControls')).toBeVisible();
    await expect(page.locator('#editorSheet')).toBeHidden();
    await expect(page.locator('#previewImage')).toBeVisible();
    await expect(page.locator('#maskFineClose')).toBeInViewport();
    await page.locator('#maskFineControls [data-mask-direction="right"]').click();
    const image=await page.locator('#dropZone').boundingBox();
    expect(image.height).toBeGreaterThan(40);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
    await page.locator('#maskFineClose').click();
    await expect(page.locator('#editModeToolbar')).toBeVisible();
  });
}
