import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';

async function imagePoint(page,x,y){
  return page.locator('#maskSvg').evaluate((svg,point)=>{
    const p=svg.createSVGPoint();p.x=point.x;p.y=point.y;
    const out=p.matrixTransform(svg.getScreenCTM());return{x:out.x,y:out.y};
  },{x,y});
}
async function dragCover(page,a,b){
  const p1=await imagePoint(page,...a),p2=await imagePoint(page,...b);
  await page.mouse.move(p1.x,p1.y);await page.mouse.down();await page.mouse.move(p2.x,p2.y);await page.mouse.up();
}

test('T15: cover creation stays continuously available without a mode toggle',async({page})=>{
  await page.setViewportSize({width:390,height:760});await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
  await expect(page.locator('#coverButton')).toHaveCount(0);await expect(page.locator('#continuousCover')).toHaveCount(0);
  const topBefore=(await page.locator('#maskSvg').boundingBox()).y;
  await dragCover(page,[8,8],[28,24]);await dragCover(page,[40,8],[60,24]);await dragCover(page,[72,8],[92,24]);
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(3);
  const topAfter=(await page.locator('#maskSvg').boundingBox()).y;expect(Math.abs(topAfter-topBefore)).toBeLessThanOrEqual(1);
});

test('T15: Shift-drag pans a zoomed view and viewport resize keeps center and zoom',async({page})=>{
  await page.setViewportSize({width:390,height:700});await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
  await page.locator('#viewZoomIn').click();await page.locator('#viewZoomIn').click();
  const before=await page.locator('#maskSvg').evaluate(svg=>({zoom:+svg.dataset.viewZoom,x:+svg.dataset.viewCenterX,y:+svg.dataset.viewCenterY}));
  const a=await imagePoint(page,60,40),b=await imagePoint(page,42,34);
  await page.keyboard.down('Shift');await page.mouse.move(a.x,a.y);
  await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:4});await page.mouse.up();await page.keyboard.up('Shift');
  const panned=await page.locator('#maskSvg').evaluate(svg=>({zoom:+svg.dataset.viewZoom,x:+svg.dataset.viewCenterX,y:+svg.dataset.viewCenterY}));
  expect(panned.zoom).toBe(before.zoom);expect(panned.x).not.toBe(before.x);
  await page.setViewportSize({width:700,height:390});
  await page.waitForTimeout(80);
  const rotated=await page.locator('#maskSvg').evaluate(svg=>({zoom:+svg.dataset.viewZoom,x:+svg.dataset.viewCenterX,y:+svg.dataset.viewCenterY}));
  expect(rotated).toEqual(panned);
});

test('T15: zoom percentage is the fit-image control and removed navigation modes stay absent',async({page})=>{
  await page.setViewportSize({width:390,height:700});await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
  for(const id of ['coverButton','continuousCover','moveImageButton','twoPointButton','viewLeft','viewRight','viewUp','viewDown','maskMoveLeft','maskMoveRight','maskMoveUp','maskMoveDown','maskWider','maskNarrower','maskTaller','maskShorter']){
    await expect(page.locator('#'+id)).toHaveCount(0);
  }
  await page.locator('#viewZoomIn').click();await page.locator('#viewZoomIn').click();
  await expect(page.locator('#viewFit')).toHaveText(/1[5-6]\d%/);
  const box=await page.locator('#maskSvg').boundingBox();
  await page.keyboard.down('Shift');await page.mouse.move(box.x+box.width*.55,box.y+box.height*.72);await page.mouse.down();await page.mouse.move(box.x+box.width*.35,box.y+box.height*.62,{steps:4});await page.mouse.up();await page.keyboard.up('Shift');
  const changed=await page.locator('#maskSvg').evaluate(svg=>({z:+svg.dataset.viewZoom,x:+svg.dataset.viewCenterX,y:+svg.dataset.viewCenterY}));
  expect(changed.z).toBeGreaterThan(1);
  await page.locator('#viewFit').click();
  await expect(page.locator('#viewFit')).toHaveText('100%');
  expect(await page.locator('#maskSvg').evaluate(svg=>({z:+svg.dataset.viewZoom,x:+svg.dataset.viewCenterX,y:+svg.dataset.viewCenterY}))).toEqual({z:1,x:.5,y:.5});
});

test('T15: 320px and short landscape keep workflow actions reachable without horizontal page scroll',async({page})=>{
  await page.setViewportSize({width:320,height:480});await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const id of ['createButton','studyButton','saveButton','viewZoomOut','viewFit','viewZoomIn']){
    const box=await page.locator('#'+id).boundingBox();expect(box.height,id).toBeGreaterThanOrEqual(id.startsWith('viewZoom')||id==='viewFit'?40:48);
  }
  await page.locator('#saveButton').click();
  await expect(page.locator('#savePanel')).toBeVisible();
  expect(await page.locator('.reveal-grid').evaluate(node=>getComputedStyle(node).display)).toBe('none');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.setViewportSize({width:700,height:390});await page.waitForTimeout(50);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('T15: Escape cancels an unfinished cover drag without creating a rectangle',async({page})=>{
  await openApp(page);await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
  const a=await imagePoint(page,20,18),b=await imagePoint(page,60,42);
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:2});
  await page.keyboard.press('Escape');await page.mouse.up();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(0);
});


test('T15: loaded create layout is vertically compact and keeps zoom with image metadata',async({page})=>{
  await page.setViewportSize({width:1200,height:800});await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
  await expect(page.locator('.input-note')).toBeHidden();
  const tools=await page.locator('#editControls').boundingBox(),status=await page.locator('.input-status-row').boundingBox(),header=await page.locator('#loadedSection').boundingBox();
  expect(status.height).toBeLessThanOrEqual(36);expect(header.y-(tools.y+tools.height)).toBeLessThan(55);
  const surface=await page.locator('.preview-surface').boundingBox(),zoom=await page.locator('#viewControls').boundingBox();
  expect(zoom.x+zoom.width).toBeLessThanOrEqual(surface.x+surface.width-4);
  expect(zoom.y).toBeGreaterThanOrEqual(surface.y+4);
  expect(zoom.y+zoom.height).toBeLessThan(surface.y+surface.height/2);
});


test('T15: mobile study keeps the image and primary guided action in one viewport',async({page})=>{
  await page.setViewportSize({width:390,height:760});await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
  await dragCover(page,[16,16],[58,38]);await page.locator('#studyButton').click();await page.locator('#guidedModeButton').click();
  if(await page.locator('#appConfirmDialog').isVisible())await page.locator('#appConfirmOk').click();
  await expect(page.locator('.page-panel')).toBeHidden();await expect(page.locator('#loadedSection')).toBeHidden();
  const preview=await page.locator('.preview-surface').boundingBox(),panel=await page.locator('#studyPanel').boundingBox(),action=await page.locator('#revealCurrentButton').boundingBox(),nav=await page.locator('.reveal-nav').boundingBox();
  await expect(page.locator('.app-header')).toBeHidden();
  expect(preview.y).toBeLessThanOrEqual(1);
  expect(preview.width).toBeGreaterThanOrEqual(386);
  expect(preview.height).toBeGreaterThanOrEqual(450);
  const mask=page.locator('#maskSvg');
  const currentCover=await mask.locator('.current-answer').boundingBox();
  expect(currentCover.width).toBeGreaterThan(preview.width*.42);
  const viewBefore=await mask.getAttribute('style');
  expect(action.y+action.height).toBeLessThanOrEqual(nav.y+1);expect(panel.y).toBeGreaterThanOrEqual(preview.y+preview.height-1);
  await expect(page.locator('#guidedMoreActions')).not.toHaveAttribute('open','');
  await page.locator('#revealCurrentButton').click();await expect(page.locator('#revealCurrentButton')).toBeHidden();await expect(page.locator('#guidedRatingActions')).toBeVisible();
  expect(await mask.getAttribute('style')).toBe(viewBefore);
  expect(await page.locator('#dropZone').boundingBox()).toEqual(preview);
  await page.locator('#studyToolsButton').click();
  await expect(page.locator('#editorSheet #guidedQuestionList button')).toHaveCount(1);
  await page.locator('#editorSheet #languageButton').click();
  await page.locator('#editorSheet #helpButton').click();
  await expect(page.locator('#helpDialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#editorSheet #helpButton')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#studyToolsButton')).toBeFocused();
  const ratings=await page.locator('#guidedRatingActions').boundingBox();expect(ratings.y+ratings.height).toBeLessThanOrEqual(nav.y+1);
  for(const id of ['saveButton','createButton']){
    await page.locator('#'+id).click();
    await expect(page.locator('.app-header #helpButton')).toBeInViewport();
  }
});

test.describe('touch study on a notebook photo',()=>{
  test.use({hasTouch:true});
  test('a portrait page fills the phone and answers toggle in place',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await openApp(page);
    const photo=await page.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1600;
      const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,900,1600);
      ctx.font='36px sans-serif';ctx.fillStyle='black';ctx.fillText('The Pacific Ocean',140,700);
      return canvas.toDataURL().split(',')[1];
    });
    await page.locator('#imageInput').setInputFiles({name:'notes.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')});
    await expect(page.locator('#previewImage')).toBeVisible();
    await dragCover(page,[130,650],[480,715]);
    await page.locator('#studyButton').tap();
    const stage=page.locator('#dropZone'),svg=page.locator('#maskSvg');
    const initial=await stage.boundingBox();
    expect(Math.min(initial.width,initial.height*900/1600)).toBeGreaterThan(335);
    await svg.locator('.mask-rect').tap();
    await expect(svg.locator('.open-answer-target')).toHaveCount(1);
    await svg.locator('.open-answer-target').tap();
    await expect(svg.locator('.mask-rect')).toHaveCount(1);
    expect(await stage.boundingBox()).toEqual(initial);
    await page.locator('#guidedModeButton').tap();
    if(await page.locator('#appConfirmDialog').isVisible())await page.locator('#appConfirmOk').tap();
    await expect(svg.locator('.current-answer')).toBeVisible();
    await page.locator('#viewZoomIn').tap();
    const zoom=await svg.getAttribute('data-view-zoom');
    await svg.locator('.current-answer').tap();
    await expect(page.locator('#guidedRatingActions')).toBeVisible();
    await expect(svg).toHaveAttribute('data-view-zoom',zoom);
    await page.setViewportSize({width:844,height:390});
    await expect(page.locator('#studyToolsButton')).toBeInViewport();
    await page.locator('#studyToolsButton').tap();
    await expect(page.locator('#editorSheet #guidedSettings')).toBeVisible();
    await page.locator('#editorSheetClose').tap();
    await expect(page.locator('.app-header')).toBeHidden();
    const landscape=await stage.boundingBox();
    const controls=await page.locator('#studyPanel').boundingBox();
    expect(landscape.height).toBeGreaterThan(240);
    expect(landscape.x+landscape.width).toBeLessThanOrEqual(controls.x+1);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(391);
  });
});
