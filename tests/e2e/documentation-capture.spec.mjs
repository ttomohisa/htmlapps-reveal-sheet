import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {openApp,imagePath} from '../helpers/app.mjs';
const currentAppVersion=JSON.parse(readFileSync('app.config.json','utf8')).version;
async function imagePoint(page,x,y){return page.locator('#maskSvg').evaluate((svg,point)=>{const p=svg.createSVGPoint();p.x=point.x;p.y=point.y;const out=p.matrixTransform(svg.getScreenCTM());return{x:out.x,y:out.y};},{x,y});}
test('T20: release capture path renders real covers in both languages and guided mobile study',async({page})=>{
 await page.setViewportSize({width:1360,height:900});await openApp(page);await expect(page.locator('#versionBadge')).toHaveText(`v${currentAppVersion}`);
 await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
 const a=await imagePoint(page,18,18),b=await imagePoint(page,58,40);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y);await page.mouse.up();
 await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);await expect(page.locator('#studyButton')).toBeEnabled();
 await page.locator('#languageButton').click();await expect(page.locator('#addButton')).toContainText(/画像を追加/);
 await page.setViewportSize({width:390,height:760});await page.locator('#studyButton').click();await page.locator('#guidedModeButton').click();
 await expect(page.locator('.page-panel')).toBeHidden();await expect(page.locator('#revealCurrentButton')).toBeVisible();
 const action=await page.locator('#revealCurrentButton').boundingBox(),nav=await page.locator('.reveal-nav').boundingBox();expect(action.y+action.height).toBeLessThanOrEqual(nav.y+1);
});
