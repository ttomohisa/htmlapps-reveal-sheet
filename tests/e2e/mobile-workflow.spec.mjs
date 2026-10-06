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

test('T15: continuous cover creation stays in cover mode only while enabled',async({page})=>{
  await page.setViewportSize({width:390,height:760});await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
  await page.locator('#continuousCover').check();
  await page.locator('#coverButton').click();
  const topBefore=(await page.locator('#maskSvg').boundingBox()).y;
  await dragCover(page,[8,8],[28,24]);
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
  const topAfter=(await page.locator('#maskSvg').boundingBox()).y;
  expect(Math.abs(topAfter-topBefore)).toBeLessThanOrEqual(1);
  await expect(page.locator('#coverButton')).toHaveAttribute('aria-pressed','true');
  await dragCover(page,[40,8],[60,24]);
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(2);
  await page.locator('#continuousCover').uncheck();
  await dragCover(page,[72,8],[92,24]);
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(3);
  await expect(page.locator('#moveImageButton')).toHaveAttribute('aria-pressed','true');
});

test('T15: touch-style pan changes center and viewport resize keeps center and zoom',async({page})=>{
  await page.setViewportSize({width:390,height:700});await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
  await page.locator('#viewZoomIn').click();await page.locator('#viewZoomIn').click();
  const before=await page.locator('#maskSvg').evaluate(svg=>({zoom:+svg.dataset.viewZoom,x:+svg.dataset.viewCenterX,y:+svg.dataset.viewCenterY}));
  const box=await page.locator('#maskSvg').boundingBox();
  await page.mouse.move(box.x+box.width*.5,box.y+box.height*.75);
  await page.mouse.down();await page.mouse.move(box.x+box.width*.35,box.y+box.height*.62,{steps:4});await page.mouse.up();
  const panned=await page.locator('#maskSvg').evaluate(svg=>({zoom:+svg.dataset.viewZoom,x:+svg.dataset.viewCenterX,y:+svg.dataset.viewCenterY}));
  expect(panned.zoom).toBe(before.zoom);expect(panned.x).not.toBe(before.x);
  await page.setViewportSize({width:700,height:390});
  await page.waitForTimeout(80);
  const rotated=await page.locator('#maskSvg').evaluate(svg=>({zoom:+svg.dataset.viewZoom,x:+svg.dataset.viewCenterX,y:+svg.dataset.viewCenterY}));
  expect(rotated).toEqual(panned);
});

test('T15: 320px and short landscape keep workflow actions reachable without horizontal page scroll',async({page})=>{
  await page.setViewportSize({width:320,height:480});await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const id of ['createButton','studyButton','saveButton','moveImageButton','coverButton','twoPointButton']){
    const box=await page.locator('#'+id).boundingBox();expect(box.height,id).toBeGreaterThanOrEqual(48);
  }
  await page.locator('#saveButton').click();
  await expect(page.locator('#savePanel')).toBeVisible();
  expect(await page.locator('.reveal-grid').evaluate(node=>getComputedStyle(node).display)).toBe('none');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.setViewportSize({width:700,height:390});await page.waitForTimeout(50);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('T15: Escape cancels an unfinished two-point cover without creating a rectangle',async({page})=>{
  await openApp(page);await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
  await page.locator('#twoPointButton').click();
  const first=await imagePoint(page,10,10);await page.mouse.click(first.x,first.y);
  await page.keyboard.press('Escape');
  const second=await imagePoint(page,60,40);await page.mouse.click(second.x,second.y);
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(0);
  await expect(page.locator('#moveImageButton')).toHaveAttribute('aria-pressed','true');
});
