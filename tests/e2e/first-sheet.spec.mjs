import {test, expect} from '@playwright/test';
import {openApp, imagePath} from '../helpers/app.mjs';

test('the import instructions lead into editing and saving a draft', async ({page}) => {
  await openApp(page);
  await page.locator('#languageButton').click();
  await expect(page.locator('#introDescription')).toContainText('答えを囲んで');
  await expect(page.locator('#studyButton')).toBeDisabled();
  await expect(page.locator('#saveButton')).toBeDisabled();
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#introDescription')).toBeHidden();
  await expect(page.locator('#stageInstruction')).toContainText('ドラッグ');
  await expect(page.locator('#saveButton')).toBeEnabled();
  await page.locator('#saveButton').click();
  await expect(page.locator('#lessonNeedsQuestion')).toBeVisible();
  await expect(page.locator('#downloadJsonButton')).toBeEnabled();
  await expect(page.locator('#downloadHtmlButton')).toBeDisabled();
});

test('a first cover can be placed, adjusted and studied entirely from the keyboard', async ({page}) => {
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  const place=page.getByRole('button',{name:'Place a cover',exact:true});
  await expect(place).toBeVisible();
  await place.focus();
  await page.keyboard.press('Enter');
  const cover=page.locator('#maskSvg .selected');
  await expect(cover).toBeFocused();
  const x=Number(await cover.getAttribute('x')),width=Number(await cover.getAttribute('width'));
  await page.keyboard.press('ArrowRight');
  await expect(cover).toBeFocused();
  expect(Number(await cover.getAttribute('x'))).toBeCloseTo(x+1,2);
  await page.keyboard.press('Alt+ArrowRight');
  expect(Number(await cover.getAttribute('width'))).toBeCloseTo(width+1,2);
  await page.locator('#studyButton').focus();
  await page.keyboard.press('Enter');
  await page.locator('#questionList button').first().focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#confirmedCount')).toHaveText('1');
});

test('free study follows a question to its page and keeps keyboard focus', async ({page}) => {
  await page.setViewportSize({width:390, height:844});
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  for(let index=0; index<2; index++){
    if(index===1){
      await page.locator('#imageInput').setInputFiles(imagePath('static.jpg'));
      await expect(page.locator('#mobilePagePosition')).toHaveText('Page 2 of 2');
      await expect(page.locator('#previewImage')).toBeVisible();
    }
    const [start,end]=await page.locator('#maskSvg').evaluate(svg=>[[25,15],[60,40]].map(([x,y])=>{
      const point=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());
      return {x:point.x,y:point.y};
    }));
    await page.mouse.move(start.x,start.y);
    await page.mouse.down();
    await page.mouse.move(end.x,end.y,{steps:5});
    await page.mouse.up();
    await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
  }
  await page.locator('#studyButton').click();
  const pages=page.locator('#studyPageSelect');
  const first=page.locator('#questionList button').first();
  await first.focus();
  await page.keyboard.press('Enter');
  await expect(pages.locator('option:checked')).toHaveText('Page 1');
  await expect(first).toBeFocused();
  await pages.selectOption({label:'Page 2'});
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
  await expect(page.locator('#confirmedCount')).toHaveText('1');
});
