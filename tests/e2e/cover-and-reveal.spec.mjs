import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';

async function screenPointForImage(page,x,y){
  return page.locator('#maskSvg').evaluate((svg,point)=>{
    const p=svg.createSVGPoint();p.x=point.x;p.y=point.y;
    const out=p.matrixTransform(svg.getScreenCTM());
    return {x:out.x,y:out.y};
  },{x,y});
}

test('T03: draw one cover, undo it, and reveal it freely without moving the image',async({page})=>{
  await page.setViewportSize({width:1000,height:800});
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  const before=await page.locator('#previewImage').boundingBox();

  await page.locator('#coverButton').click();
  await expect(page.locator('#maskSvg')).toBeVisible();
  const start=await screenPointForImage(page,30,28);
  const end=await screenPointForImage(page,66,44);
  await page.mouse.move(start.x,start.y);
  await page.mouse.down();
  await page.mouse.move(end.x,end.y);
  await page.mouse.up();

  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
  await expect(page.locator('#studyButton')).toBeEnabled();

  await page.locator('#undoButton').click();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(0);
  await page.locator('#redoButton').click();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);

  await page.locator('#studyButton').click();
  await expect(page.locator('#studyPanel')).toBeVisible();
  await expect(page.locator('#confirmedCount')).toHaveText('0');
  await expect(page.locator('#studyQuestionCount')).toHaveText('1');
  const studyBefore=await page.locator('#previewImage').boundingBox();

  await page.locator('#maskSvg .mask-rect').click();
  await expect(page.locator('#confirmedCount')).toHaveText('1');
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(0);
  await page.locator('#questionList button').first().click();
  await expect(page.locator('#confirmedCount')).toHaveText('1');
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);

  const studyAfter=await page.locator('#previewImage').boundingBox();
  expect(studyAfter).toEqual(studyBefore);
  expect(studyBefore.width).toBe(before.width);
  expect(studyBefore.height).toBe(before.height);
});

test('T03: selected cover moves and resizes directly on the image',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  await page.locator('#coverButton').click();
  const first=await screenPointForImage(page,24,20),second=await screenPointForImage(page,54,40);
  await page.mouse.move(first.x,first.y);await page.mouse.down();await page.mouse.move(second.x,second.y);await page.mouse.up();
  const rect=page.locator('#maskSvg .mask-rect');await expect(rect).toHaveCount(1);
  await expect(page.locator('#maskSvg .mask-resize-handle')).toHaveCount(4);

  const beforeX=Number(await rect.getAttribute('x')),box=await rect.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+24,box.y+box.height/2+12,{steps:4});await page.mouse.up();
  expect(Number(await rect.getAttribute('x'))).toBeGreaterThan(beforeX);

  const beforeWidth=Number(await rect.getAttribute('width')),handle=page.locator('.mask-resize-handle[data-resize-corner="se"]'),handleBox=await handle.boundingBox();
  await page.mouse.move(handleBox.x+handleBox.width/2,handleBox.y+handleBox.height/2);await page.mouse.down();await page.mouse.move(handleBox.x+handleBox.width/2+28,handleBox.y+handleBox.height/2+14,{steps:4});await page.mouse.up();
  expect(Number(await rect.getAttribute('width'))).toBeGreaterThan(beforeWidth);

  await page.locator('#maskDelete').click();await expect(rect).toHaveCount(0);
});
