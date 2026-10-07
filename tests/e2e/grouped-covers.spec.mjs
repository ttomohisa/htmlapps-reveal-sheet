import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';

async function imagePoint(page,x,y){return page.locator('#maskSvg').evaluate((svg,point)=>{const p=svg.createSVGPoint();p.x=point.x;p.y=point.y;const out=p.matrixTransform(svg.getScreenCTM());return{x:out.x,y:out.y};},{x,y});}
async function addCover(page,a,b){
  const p1=await imagePoint(page,...a),p2=await imagePoint(page,...b);
  await page.mouse.move(p1.x,p1.y);await page.mouse.down();await page.mouse.move(p2.x,p2.y);await page.mouse.up();
}

test('T06: group two covers as one question and keep an auxiliary cover closed',async({page})=>{
  await openApp(page);await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
  await addCover(page,[10,10],[35,28]);await addCover(page,[45,10],[70,28]);await addCover(page,[80,10],[105,28]);
  await expect(page.locator('#coverList button')).toHaveCount(3);

  await page.locator('#coverList button').nth(0).click();
  await page.locator('#coverList button').nth(1).click();
  await expect(page.locator('#groupButton')).toBeEnabled();
  await page.locator('#groupButton').click();
  await expect(page.locator('#questionCountEdit')).toHaveText('2');

  await page.locator('#coverList button').nth(2).click();
  await page.locator('#makeAuxiliaryButton').click();
  await expect(page.locator('#questionCountEdit')).toHaveText('1');

  await page.locator('#studyButton').click();
  await expect(page.locator('#studyQuestionCount')).toHaveText('1');
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(3);
  await page.locator('#maskSvg .mask-rect').first().click();
  await expect(page.locator('#confirmedCount')).toHaveText('1');
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
  await expect(page.locator('#maskSvg .mask-rect')).toHaveClass(/auxiliary/);
  await page.locator('#hideAllButton').click();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(3);
});

test('T06: overlapping separate questions warn and opening one leaves the other cover visible',async({page})=>{
  await openApp(page);await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
  await addCover(page,[20,15],[70,45]);await addCover(page,[78,30],[45,58]);
  await expect(page.locator('#overlapWarning')).toBeVisible();
  await page.locator('#studyButton').click();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(2);
  await page.locator('#questionList button').first().click();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
});
