import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';

async function imagePoint(page,x,y){return page.locator('#maskSvg').evaluate((svg,point)=>{const p=svg.createSVGPoint();p.x=point.x;p.y=point.y;const out=p.matrixTransform(svg.getScreenCTM());return{x:out.x,y:out.y};},{x,y});}
async function addCover(page,a,b){await page.locator('#coverButton').click();const p1=await imagePoint(page,...a),p2=await imagePoint(page,...b);await page.mouse.move(p1.x,p1.y);await page.mouse.down();await page.mouse.move(p2.x,p2.y);await page.mouse.up();}
async function enable(page,id){await page.locator(id).click();await expect(page.locator('#appConfirmDialog')).toBeVisible();await page.locator('#appConfirmOk').click();await expect(page.locator(id)).toBeChecked();}
async function makeTwo(page){await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();await addCover(page,[10,10],[32,28]);await addCover(page,[52,10],[74,28]);}
async function enterGuided(page){await page.locator('#studyButton').click();await page.locator('#guidedModeButton').click();await expect(page.locator('#guidedPanel')).toBeVisible();}
async function restoreDraftAfterReload(page){await page.reload();await page.locator('#addButton').waitFor({state:'visible'});await expect(page.locator('#appConfirmDialog')).toBeVisible();await page.locator('#appConfirmOk').click();await expect(page.locator('#pageList button')).toHaveCount(1);}

test('T10: study progress opt-in is separate and resume starts with the current answer closed',async({page})=>{
  await openApp(page);await enable(page,'#draftOptIn');await makeTwo(page);await expect(page.locator('#draftSaveStatus')).toContainText(/Saved|保存しました/i,{timeout:5000});
  await expect(page.locator('#studyOptIn')).not.toBeChecked();await enable(page,'#studyOptIn');
  await enterGuided(page);await page.locator('#revealCurrentButton').click();await page.locator('#recalledButton').click();
  await page.locator('#revealCurrentButton').click();await expect(page.locator('#recalledButton')).toBeEnabled();
  await expect(page.locator('#studySaveStatus')).toContainText(/Saved|保存しました/i,{timeout:5000});

  await restoreDraftAfterReload(page);
  await page.locator('#studyButton').click();
  await expect(page.locator('#appConfirmDialog')).toBeVisible();await expect(page.locator('#appConfirmMessage')).toContainText(/study|学習/i);await page.locator('#appConfirmOk').click();
  await expect(page.locator('#guidedPanel')).toBeVisible();await expect(page.locator('#guidedProgress')).toContainText('2 / 2');
  await expect(page.locator('#guidedQuestionList button').first()).toHaveAttribute('data-rating','recalled');
  await expect(page.locator('#recalledButton')).toBeDisabled();await expect(page.locator('#revealCurrentButton')).toBeEnabled();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(2);
});

test('T10: changed document identity does not apply an older study record',async({page})=>{
  await openApp(page);await makeTwo(page);await enable(page,'#studyOptIn');await enterGuided(page);
  await page.locator('#revealCurrentButton').click();await page.locator('#recalledButton').click();await expect(page.locator('#studySaveStatus')).toContainText(/Saved|保存しました/i,{timeout:5000});
  await page.locator('#createButton').click();await page.locator('#pageTitleInput').fill('Changed content');await page.locator('#pageTitleInput').press('Enter');
  await page.locator('#studyButton').click();
  await expect(page.locator('#appConfirmDialog')).toBeHidden();await expect(page.locator('#freeStudyPanel')).toBeVisible();
  await page.locator('#guidedModeButton').click();await expect(page.locator('#guidedQuestionList button').first()).toHaveAttribute('data-rating','unanswered');
});

test('T10: clearing only study records keeps the draft setting/data and unrelated browser data',async({page})=>{
  await openApp(page);await page.evaluate(()=>localStorage.setItem('other-app-value','keep'));await enable(page,'#draftOptIn');await makeTwo(page);await expect(page.locator('#draftSaveStatus')).toContainText(/Saved|保存しました/i,{timeout:5000});
  await enable(page,'#studyOptIn');await enterGuided(page);await page.locator('#revealCurrentButton').click();await expect(page.locator('#studySaveStatus')).toContainText(/Saved|保存しました/i,{timeout:5000});
  await page.locator('#clearStudyButton').click();await expect(page.locator('#appConfirmDialog')).toBeVisible();await page.locator('#appConfirmOk').click();
  await expect(page.locator('#studyOptIn')).not.toBeChecked();await expect(page.locator('#draftOptIn')).toBeChecked();expect(await page.evaluate(()=>localStorage.getItem('other-app-value'))).toBe('keep');

  await restoreDraftAfterReload(page);await page.locator('#studyButton').click();await expect(page.locator('#appConfirmDialog')).toBeHidden();
});

test('T10: clearing the saved draft does not clear study opt-in or unrelated browser data',async({page})=>{
  await openApp(page);await page.evaluate(()=>localStorage.setItem('other-app-value','keep'));await enable(page,'#draftOptIn');await enable(page,'#studyOptIn');await makeTwo(page);await expect(page.locator('#draftSaveStatus')).toContainText(/Saved|保存しました/i,{timeout:5000});
  await page.locator('#clearDraftButton').click();await expect(page.locator('#appConfirmDialog')).toBeVisible();await page.locator('#appConfirmOk').click();
  await expect(page.locator('#draftOptIn')).not.toBeChecked();await expect(page.locator('#studyOptIn')).toBeChecked();expect(await page.evaluate(()=>localStorage.getItem('other-app-value'))).toBe('keep');
});


test('T10: starting a new study mode in the same tab advances the same record without a false conflict',async({page})=>{
  await openApp(page);await makeTwo(page);await enable(page,'#studyOptIn');await enterGuided(page);
  await page.locator('#revealCurrentButton').click();await page.locator('#recalledButton').click();
  await expect(page.locator('#studySaveStatus')).toContainText(/Saved|保存しました/i,{timeout:5000});
  await page.locator('#freeModeButton').click();await expect(page.locator('#appConfirmDialog')).toBeVisible();await page.locator('#appConfirmOk').click();
  await page.locator('#questionList button').first().click();
  await expect(page.locator('#studySaveStatus')).toContainText(/Saved|保存しました/i,{timeout:5000});
  await expect(page.locator('#studySaveStatus')).not.toContainText(/another tab|別タブ/i);
});
