import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';

test('T03: draw one cover, undo it, and reveal it freely without moving the image',async({page})=>{
  await page.setViewportSize({width:1000,height:800});
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  const before=await page.locator('#previewImage').boundingBox();

  await page.locator('#coverButton').click();
  const surface=await page.locator('#maskSvg').boundingBox();
  await page.mouse.move(surface.x+surface.width*.25,surface.y+surface.height*.35);
  await page.mouse.down();
  await page.mouse.move(surface.x+surface.width*.55,surface.y+surface.height*.55);
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
  expect(studyBefore).toEqual(before);
});

test('T03: two-point cover and size controls provide non-drag alternatives',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  await page.locator('#twoPointButton').click();
  const surface=await page.locator('#maskSvg').boundingBox();
  await page.mouse.click(surface.x+surface.width*.2,surface.y+surface.height*.25);
  await page.mouse.click(surface.x+surface.width*.45,surface.y+surface.height*.5);
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
  const before=await page.locator('#maskSvg .mask-rect').getAttribute('x');
  await page.locator('#maskMoveRight').click();
  const after=await page.locator('#maskSvg .mask-rect').getAttribute('x');
  expect(Number(after)).toBeGreaterThan(Number(before));
  await page.locator('#maskWider').click();
  await page.locator('#maskDelete').click();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(0);
});
