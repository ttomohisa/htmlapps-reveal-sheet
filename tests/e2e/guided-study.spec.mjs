import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';

async function imagePoint(page,x,y){return page.locator('#maskSvg').evaluate((svg,point)=>{const p=svg.createSVGPoint();p.x=point.x;p.y=point.y;const out=p.matrixTransform(svg.getScreenCTM());return{x:out.x,y:out.y};},{x,y});}
async function addCover(page,a,b){const p1=await imagePoint(page,...a),p2=await imagePoint(page,...b);await page.mouse.move(p1.x,p1.y);await page.mouse.down();await page.mouse.move(p2.x,p2.y);await page.mouse.up();}
async function makeThreeQuestions(page){
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
  await addCover(page,[8,10],[30,28]);await addCover(page,[42,10],[64,28]);await addCover(page,[76,10],[98,28]);
  await expect(page.locator('#coverList button')).toHaveCount(3);
}

test('T07: guided study requires reveal before rating and summarizes one pass',async({page})=>{
  await openApp(page);await makeThreeQuestions(page);
  await page.locator('#studyButton').click();await page.locator('#guidedModeButton').click();
  await expect(page.locator('#guidedPanel')).toBeVisible();await expect(page.locator('#guidedSettings')).toBeVisible();await expect(page.locator('#guidedQuestionNavigator')).toBeVisible();
  await expect(page.locator('#guidedProgress')).toContainText('1 / 3');
  await expect(page.locator('#recalledButton')).toBeDisabled();await expect(page.locator('#againButton')).toBeDisabled();

  await page.locator('#revealCurrentButton').click();await expect(page.locator('#recalledButton')).toBeEnabled();
  await page.locator('#recalledButton').click();await expect(page.locator('#guidedProgress')).toContainText('2 / 3');
  await page.locator('#revealCurrentButton').click();await page.locator('#againButton').click();
  await expect(page.locator('#guidedProgress')).toContainText('3 / 3');await page.locator('#guidedMoreActions > summary').click();await page.locator('#skipButton').click();

  await expect(page.locator('#studyResults')).toBeVisible();
  await expect(page.locator('#resultTotal')).toHaveText('3');await expect(page.locator('#resultRecalled')).toHaveText('1');await expect(page.locator('#resultAgain')).toHaveText('1');await expect(page.locator('#resultSkipped')).toHaveText('1');await expect(page.locator('#resultUnanswered')).toHaveText('0');
  await expect(page.locator('#reviewAgainButton')).toBeVisible();await expect(page.locator('#reviewUncheckedButton')).toBeVisible();

  await page.locator('#reviewAgainButton').click();await expect(page.locator('#guidedProgress')).toContainText('1 / 1');
  await expect(page.locator('#studyResults')).toBeHidden();
});

test('T07: other-answer setting starts a new guided session and auxiliary cover stays closed',async({page})=>{
  await openApp(page);await makeThreeQuestions(page);
  await expect(page.locator('#makeAuxiliaryButton')).toBeVisible();await page.locator('#makeAuxiliaryButton').click();
  await page.locator('#studyButton').click();await page.locator('#guidedModeButton').click();
  await page.locator('#guidedSettings > summary').click();await page.locator('#otherAnswersVisible').check();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(2);
  await page.locator('#revealCurrentButton').click();await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
  await expect(page.locator('#maskSvg .mask-rect')).toHaveClass(/auxiliary/);

  await page.locator('#otherAnswersHidden').check();
  await expect(page.locator('#appConfirmDialog')).toBeVisible();await page.locator('#appConfirmOk').click();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(3);
});

test('T07: keyboard reveals, rates, skips and early finish keeps unanswered',async({page})=>{
  await openApp(page);await makeThreeQuestions(page);await page.locator('#studyButton').click();await page.locator('#guidedModeButton').click();
  await page.keyboard.press('Space');await expect(page.locator('#recalledButton')).toBeEnabled();await page.keyboard.press('1');
  await page.keyboard.press('s');
  await page.locator('#guidedMoreActions > summary').click();await page.locator('#finishStudyButton').click();
  await expect(page.locator('#resultRecalled')).toHaveText('1');await expect(page.locator('#resultSkipped')).toHaveText('1');await expect(page.locator('#resultUnanswered')).toHaveText('1');
});
