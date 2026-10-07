import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';

async function imagePoint(page,x,y){return page.locator('#maskSvg').evaluate((svg,point)=>{const p=svg.createSVGPoint();p.x=point.x;p.y=point.y;const out=p.matrixTransform(svg.getScreenCTM());return{x:out.x,y:out.y};},{x,y});}
async function addCover(page,a,b){await page.locator('#coverButton').click();const p1=await imagePoint(page,...a),p2=await imagePoint(page,...b);await page.mouse.move(p1.x,p1.y);await page.mouse.down();await page.mouse.move(p2.x,p2.y);await page.mouse.up();}
async function makeThree(page){await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();await addCover(page,[8,10],[30,28]);await addCover(page,[42,10],[64,28]);await addCover(page,[76,10],[98,28]);}
async function guided(page){await page.locator('#studyButton').click();await page.locator('#guidedModeButton').click();await expect(page.locator('#guidedPanel')).toBeVisible();}
async function rate(page,ratingButton){await page.locator('#revealCurrentButton').click();await page.locator(ratingButton).click();}
async function viewState(page){return page.locator('#maskSvg').evaluate(svg=>({zoom:Number(svg.dataset.viewZoom),centerX:Number(svg.dataset.viewCenterX),centerY:Number(svg.dataset.viewCenterY)}));}
async function panView(page,dxFraction,dyFraction=0){
  const box=await page.locator('#maskSvg').boundingBox();
  const x=box.x+box.width*.5,y=box.y+box.height*.72;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+box.width*dxFraction,y+box.height*dyFraction,{steps:4});await page.mouse.up();
}

test('T08: targeted edit returns to the same question, preserves view, and invalidates only that rating',async({page})=>{
  await openApp(page);await makeThree(page);await guided(page);
  await rate(page,'#recalledButton');await rate(page,'#againButton');
  await page.locator('#guidedQuestionList button').nth(0).click();
  await page.locator('#viewZoomIn').click();await panView(page,-.18);const before=await viewState(page);expect(before.zoom).toBeGreaterThan(1);

  await page.locator('#editCurrentQuestionButton').click();await expect(page.locator('#returnToStudyButton')).toBeVisible();
  await expect(page.locator('#maskControls')).toBeVisible();await page.keyboard.press('ArrowRight');
  await page.locator('#returnToStudyButton').click();await expect(page.locator('#guidedPanel')).toBeVisible();
  expect(await viewState(page)).toEqual(before);
  await expect(page.locator('#revealCurrentButton')).toBeEnabled();await expect(page.locator('#recalledButton')).toBeDisabled();
  await expect(page.locator('#guidedQuestionList button').nth(0)).toHaveAttribute('data-rating','unanswered');
  await expect(page.locator('#guidedQuestionList button').nth(1)).toHaveAttribute('data-rating','again');
});

test('T08: deleting the current question while editing continues at the next surviving question',async({page})=>{
  await openApp(page);await makeThree(page);await guided(page);
  await page.locator('#guidedQuestionList button').nth(1).click();await expect(page.locator('#guidedProgress')).toContainText('2 / 3');
  await page.locator('#editCurrentQuestionButton').click();await page.locator('#maskDelete').click();await page.locator('#returnToStudyButton').click();
  await expect(page.locator('#guidedProgress')).toContainText('2 / 2');await expect(page.locator('#guidedQuestionList button')).toHaveCount(2);await expect(page.locator('#revealCurrentButton')).toBeEnabled();
});

test('T08: explicit This question recenters an offscreen guided answer without automatic movement',async({page})=>{
  await openApp(page);await makeThree(page);await guided(page);
  await page.locator('#viewZoomIn').click();await page.locator('#viewZoomIn').click();await panView(page,-.34);
  const far=await viewState(page);await expect(page.locator('#focusQuestionButton')).toBeVisible();
  await page.locator('#revealCurrentButton').click();expect(await viewState(page)).toEqual(far);
  await page.locator('#focusQuestionButton').click();const focused=await viewState(page);expect(focused).not.toEqual(far);await expect(page.locator('#focusQuestionButton')).toBeHidden();
});


test('T08: language switch preserves guided view state and keeps the current answer closed',async({page})=>{
  await openApp(page);await makeThree(page);await guided(page);
  await page.locator('#viewZoomIn').click();await panView(page,-.18);const before=await viewState(page);
  await expect(page.locator('#recalledButton')).toBeDisabled();
  await page.locator('#languageButton').click();
  expect(await viewState(page)).toEqual(before);
  await expect(page.locator('#recalledButton')).toBeDisabled();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(3);
});

test('T08: page switch keeps the raw image and cover layer hidden until preview decode completes',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles([imagePath('static.png'),imagePath('static.jpg')]);
  await expect(page.locator('#pageList button')).toHaveCount(2);await expect(page.locator('#previewImage')).toBeVisible();
  await page.evaluate(()=>{
    const image=document.querySelector('#previewImage'),original=image.decode.bind(image);
    image.decode=()=>new Promise((resolve,reject)=>{window.releasePreviewDecode=()=>original().then(resolve,reject);});
  });
  await page.locator('#pageList button').first().click();
  await expect.poll(()=>page.evaluate(()=>typeof window.releasePreviewDecode)).toBe('function');
  await expect(page.locator('#previewImage')).toBeHidden();
  await expect(page.locator('#maskSvg')).toBeHidden();
  await page.evaluate(()=>window.releasePreviewDecode());
  await expect(page.locator('#previewImage')).toBeVisible();
});
