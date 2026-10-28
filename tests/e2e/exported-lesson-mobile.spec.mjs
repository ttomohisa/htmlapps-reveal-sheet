import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {openApp,imagePath} from '../helpers/app.mjs';

async function cover(page,a,b){
  const pts=await page.locator('#maskSvg').evaluate((svg,corners)=>corners.map(([x,y])=>{
    const point=svg.createSVGPoint();point.x=x;point.y=y;
    const p=point.matrixTransform(svg.getScreenCTM());return{x:p.x,y:p.y};
  }),[a,b]);
  await page.mouse.move(pts[0].x,pts[0].y);await page.mouse.down();
  await page.mouse.move(pts[1].x,pts[1].y,{steps:5});await page.mouse.up();
}
async function exportLesson(page,testInfo,twoPages=false){
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  await cover(page,[8,8],[34,27]);await cover(page,[45,8],[73,27]);
  if(twoPages){
    await page.locator('#imageInput').setInputFiles(imagePath('static.jpg'));
    await expect(page.locator('#pageList .page-item')).toHaveCount(2);
    await expect(page.locator('#previewImage')).toBeVisible();
    await cover(page,[12,12],[47,34]);
  }
  await page.locator('#saveButton').click();
  await expect(page.locator('#savePanel')).toBeVisible();
  const dl=page.waitForEvent('download');
  await page.locator('#downloadHtmlButton').click();
  const download=await dl;
  const filepath=testInfo.outputPath('mobile-study.reveal.html');
  await download.saveAs(filepath);
  const html=readFileSync(filepath,'utf8');
  expect(html).toContain('reveal-sheet-data');
  expect(html).toContain('kind');
  return filepath;
}
async function openLesson(context,filepath,viewport,locale='ja-JP'){
  const lesson=await context.newPage();
  await lesson.setViewportSize(viewport);
  const errors=[],requests=[];
  lesson.on('pageerror',e=>errors.push(e.message));
  lesson.on('request',r=>{if(/^https?:/i.test(r.url()))requests.push(r.url());});
  await lesson.goto(pathToFileURL(filepath).href);
  await expect(lesson.locator('#lessonReady')).toBeVisible();
  await expect(lesson.locator('#previewImage')).toBeVisible();
  expect(errors).toEqual([]);expect(requests).toEqual([]);
  return lesson;
}
test('exported lesson: mobile study uses image-first workspace and keeps actions visible',async({page,context},testInfo)=>{
  const filepath=await exportLesson(page,testInfo);
  const lesson=await openLesson(context,filepath,{width:390,height:844});
  const image=await lesson.locator('.lesson-preview').boundingBox();
  const mode=await lesson.locator('.lesson-mode-switch').boundingBox();
  expect(image.height).toBeGreaterThan(300);
  expect(mode.y).toBeGreaterThanOrEqual(image.y+image.height-1);
  expect(await lesson.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
  await expect(lesson.locator('#lessonZoomFit')).toHaveText('100%');
  await lesson.locator('#lessonZoomIn').click();
  await expect(lesson.locator('#lessonZoomFit')).not.toHaveText('100%');
  const beforeX=Number(await lesson.locator('#maskSvg').getAttribute('data-view-center-x'));
  const stage=await lesson.locator('#lessonStage').boundingBox();
  await lesson.mouse.move(stage.x+stage.width*.5,stage.y+stage.height*.84);
  await lesson.mouse.down();
  await lesson.mouse.move(stage.x+stage.width*.35,stage.y+stage.height*.83,{steps:8});
  await lesson.mouse.up();
  const afterX=Number(await lesson.locator('#maskSvg').getAttribute('data-view-center-x'));
  expect(afterX).not.toBe(beforeX);
  await lesson.locator('#lessonZoomFit').click();
  await expect(lesson.locator('#lessonZoomFit')).toHaveText('100%');
  await expect(lesson.locator('#lessonQuestionsButton')).toBeVisible();
  await lesson.locator('#lessonGuidedMode').click();
  await expect(lesson.locator('#lessonRevealCurrent')).toBeVisible();
  await expect(lesson.locator('#lessonRecalled')).toBeHidden();
  await lesson.locator('#lessonRevealCurrent').click();
  await expect(lesson.locator('#lessonRevealCurrent')).toBeHidden();
  await expect(lesson.locator('#lessonRecalled')).toBeVisible();
  await lesson.locator('#lessonRecalled').click();
  await expect(lesson.locator('#lessonGuidedProgress')).toContainText('2 / 2');
  await lesson.locator('#lessonQuestionsButton').click();
  await expect(lesson.locator('#lessonSheet')).toBeVisible();
  await expect(lesson.locator('#lessonSheet #lessonGuidedList button')).toHaveCount(2);
  await lesson.keyboard.press('Escape');
  await expect(lesson.locator('#lessonSheet')).toBeHidden();
  await expect(lesson.locator('#lessonQuestionsButton')).toBeFocused();
  await lesson.close();
});
test('exported lesson: mobile pages, settings, language and editable save remain available',async({page,context},testInfo)=>{
  const filepath=await exportLesson(page,testInfo,true);
  const lesson=await openLesson(context,filepath,{width:390,height:780});
  await expect(lesson.locator('#lessonPagePosition')).toContainText('1');
  await lesson.locator('#lessonNextPage').click();
  await expect(lesson.locator('#lessonPagePosition')).toContainText('2');
  await lesson.locator('#lessonPageToggle').click();
  await expect(lesson.locator('#lessonSheet #lessonPages .lesson-page-button')).toHaveCount(2);
  await lesson.locator('#lessonSheet #lessonPages .lesson-page-button').first().click();
  await expect(lesson.locator('#lessonSheet')).toBeHidden();
  await expect(lesson.locator('#lessonPrevPage')).toBeDisabled();
  await lesson.locator('#lessonSettingsButton').click();
  await expect(lesson.locator('#lessonSheet #lessonStudyOptIn')).toBeVisible();
  await expect(lesson.locator('#lessonSheet #lessonSaveEditableButton')).toBeVisible();
  await lesson.locator('#lessonSheetClose').click();
  await lesson.locator('#lessonLanguage').click();
  await lesson.locator('#lessonSettingsButton').click();
  await expect(lesson.locator('#lessonSheetTitle')).toContainText('設定');
  const download=lesson.waitForEvent('download');
  await lesson.locator('#lessonSaveEditableButton').click();
  await expect(lesson.locator('#lessonConfirmDialog')).toBeVisible();
  await lesson.locator('#lessonConfirmOk').click();
  const saved=await download;expect(saved.suggestedFilename()).toMatch(/\.reveal\.json$/);
  await lesson.locator('#lessonSheetClose').click();
  await expect(lesson.locator('#lessonSettingsButton')).toBeFocused();
  await lesson.close();
});
for(const viewport of [{width:320,height:480},{width:700,height:390}]){
  test(`exported lesson: controls fit ${viewport.width}×${viewport.height} without viewport overflow`,async({page,context},testInfo)=>{
    const filepath=await exportLesson(page,testInfo);
    const lesson=await openLesson(context,filepath,viewport);
    await lesson.locator('#lessonGuidedMode').click();
    const image=await lesson.locator('.lesson-preview').boundingBox();
    const control=await lesson.locator('#lessonRevealCurrent').boundingBox();
    expect(image.height).toBeGreaterThanOrEqual(75);
    expect(control.y+control.height).toBeLessThanOrEqual(viewport.height+1);
    expect(await lesson.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
    await lesson.locator('#lessonSettingsButton').click();
    await expect(lesson.locator('#lessonSheet')).toBeVisible();
    await lesson.locator('#lessonSaveEditableButton').scrollIntoViewIfNeeded();
    await expect(lesson.locator('#lessonSaveEditableButton')).toBeInViewport();
    await lesson.keyboard.press('Escape');
    await expect(lesson.locator('#lessonSheet')).toBeHidden();
    await lesson.close();
  });
}
