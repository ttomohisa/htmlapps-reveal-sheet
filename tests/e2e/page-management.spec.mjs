import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';

async function dragPage(page,from,to){
  const cards=page.locator('#pageList .page-item'),source=cards.nth(from),target=cards.nth(to),grip=source.locator('.page-card-meta');
  const gb=await grip.boundingBox(),tb=await target.boundingBox();
  await page.mouse.move(gb.x+gb.width/2,gb.y+gb.height/2);await page.mouse.down();
  await expect(source).toHaveClass(/dragging/);
  expect(await source.evaluate(node=>getComputedStyle(node).transform)).not.toBe('none');
  await page.mouse.move(tb.x+tb.width*.72,tb.y+tb.height*.48,{steps:6});const shifted=page.locator('#pageList .page-item.reorder-shift');await expect(shifted).toHaveCount(1);const shiftValue=await shifted.first().evaluate(node=>Math.max(Math.abs(parseFloat(node.style.getPropertyValue('--page-shift-x'))||0),Math.abs(parseFloat(node.style.getPropertyValue('--page-shift-y'))||0)));expect(shiftValue).toBeGreaterThan(60);await page.mouse.up();
}

test('T05: page cards edit title/description, drag reorder, trash delete and Undo',async({page})=>{
  await page.setViewportSize({width:1200,height:900});await openApp(page);
  await page.locator('#imageInput').setInputFiles([imagePath('static.png'),imagePath('static.jpg'),imagePath('static.webp')]);
  const cards=page.locator('#pageList .page-item');await expect(cards).toHaveCount(3);

  const middle=cards.nth(1);await middle.click();
  await middle.locator('.page-card-title').fill('Middle page');await middle.locator('.page-card-title').press('Enter');
  await expect(cards.nth(1).locator('.page-card-title')).toHaveValue('Middle page');
  await cards.nth(1).locator('.page-description-summary').click();
  await cards.nth(1).locator('.page-card-description-input').fill('Remember the diagram direction.');await cards.nth(1).locator('.page-card-description-input').blur();
  await expect(cards.nth(1).locator('.page-description-summary-text')).toContainText('Remember the diagram direction.');

  await dragPage(page,1,2);
  await expect(cards.nth(2).locator('.page-card-title')).toHaveValue('Middle page');
  await dragPage(page,2,1);
  await expect(cards.nth(1).locator('.page-card-title')).toHaveValue('Middle page');

  await cards.nth(1).locator('.page-delete-button').click();await expect(page.locator('#appConfirmDialog')).toBeVisible();await page.locator('#appConfirmCancel').click();await expect(cards).toHaveCount(3);
  await cards.nth(1).locator('.page-delete-button').click();await page.locator('#appConfirmOk').click();await expect(cards).toHaveCount(2);
  await page.locator('#undoButton').click();await expect(cards).toHaveCount(3);expect(await page.locator('#pageList input.page-card-title').evaluateAll(nodes=>nodes.some(node=>node.value==='Middle page'))).toBe(true);
});

test('T05: deleting the last page from its trash icon returns to empty and Undo restores it',async({page})=>{
  await openApp(page);await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  const cards=page.locator('#pageList .page-item');await expect(cards).toHaveCount(1);
  await cards.first().locator('.page-delete-button').click();await page.locator('#appConfirmOk').click();
  await expect(cards).toHaveCount(0);await expect(page.locator('#previewImage')).toBeHidden();await expect(page.locator('#emptyPreview')).toBeVisible();
  await page.locator('#undoButton').click();await expect(cards).toHaveCount(1);await expect(page.locator('#previewImage')).toBeVisible();
});

test('T05: card editing replaces the old page action row and stays compact',async({page})=>{
  await page.setViewportSize({width:1100,height:800});await openApp(page);
  await page.locator('#imageInput').setInputFiles([imagePath('static.png'),imagePath('static.jpg')]);
  await expect(page.locator('#pageList .page-item')).toHaveCount(2);await expect(page.locator('#pageList .page-item').first().locator('.page-card-title')).toBeVisible();
  await expect(page.locator('#pageControls')).toHaveCount(0);await expect(page.locator('#pagePrevButton')).toHaveCount(0);await expect(page.locator('#pageNextButton')).toHaveCount(0);
  const card=page.locator('#pageList .page-item').first(),title=card.locator('.page-card-title'),drag=card.locator('.page-drag-handle'),trash=card.locator('.page-delete-button');
  await expect(card).toBeVisible();await expect(title).toBeVisible();await expect(drag).toBeVisible();await expect(trash).toBeVisible();
  const tb=await title.boundingBox(),db=await drag.boundingBox(),xb=await trash.boundingBox();
  expect(Math.abs((tb.y+tb.height/2)-(db.y+db.height/2))).toBeLessThanOrEqual(3);expect(Math.abs((tb.y+tb.height/2)-(xb.y+xb.height/2))).toBeLessThanOrEqual(3);
  await expect(card.locator('.page-description-summary')).toContainText(/Add description|説明を追加/);const cb=await card.boundingBox(),sb=await card.locator('.page-description-summary').boundingBox();expect(sb.x+sb.width).toBeLessThanOrEqual(cb.x+cb.width-1);expect(sb.y+sb.height).toBeLessThanOrEqual(cb.y+cb.height+1);
});

test('T05: page-card drag reorder also works in the horizontal mobile list',async({page})=>{
  await page.setViewportSize({width:390,height:780});await openApp(page);
  await page.locator('#imageInput').setInputFiles([imagePath('static.png'),imagePath('static.jpg'),imagePath('static.webp')]);
  const titles=page.locator('#pageList .page-card-title');await expect(titles).toHaveCount(3);await expect(titles.nth(0)).toHaveValue(/Page 1|ページ1/);
  await dragPage(page,0,1);await expect(titles.nth(1)).toHaveValue(/Page 1|ページ1/);
});

test('T05: drag handle keeps a keyboard reorder alternative',async({page})=>{
  await openApp(page);await page.locator('#imageInput').setInputFiles([imagePath('static.png'),imagePath('static.jpg')]);
  const cards=page.locator('#pageList .page-item');await expect(cards.nth(0).locator('input.page-card-title')).toBeVisible();const firstTitle=await cards.nth(0).locator('input.page-card-title').inputValue();
  await cards.nth(0).locator('.page-drag-handle').focus();await page.keyboard.press('ArrowDown');
  await expect(cards.nth(1).locator('input.page-card-title')).toHaveValue(firstTitle);
});


test('T05: save mode keeps page-card titles readable in the full card width',async({page})=>{
  await page.setViewportSize({width:1100,height:800});await openApp(page);await page.locator('#imageInput').setInputFiles([imagePath('static.png'),imagePath('static.jpg')]);
  await page.locator('#saveButton').click();await expect(page.locator('#savePanel')).toBeVisible();
  const card=page.locator('#pageList .page-item').first(),title=card.locator('.page-card-title-static');await expect(title).toContainText(/Page 1|ページ1/);
  const cb=await card.boundingBox(),tb=await title.boundingBox();expect(tb.width).toBeGreaterThan(cb.width*.65);
});

test('T05: many page cards keep the Add description row visible instead of flex-shrinking',async({page})=>{
  await page.setViewportSize({width:1200,height:760});await openApp(page);
  await page.locator('#imageInput').setInputFiles([
    imagePath('static.png'),imagePath('static.jpg'),imagePath('static.webp'),
    imagePath('static.png'),imagePath('static.jpg'),imagePath('static.webp')
  ]);
  const cards=page.locator('#pageList .page-item');await expect(cards).toHaveCount(6);
  for(let i=0;i<6;i++){
    const card=cards.nth(i),summary=card.locator('.page-description-summary');
    await expect(summary).toBeVisible();
    const cb=await card.boundingBox(),sb=await summary.boundingBox();
    expect(sb.y+sb.height).toBeLessThanOrEqual(cb.y+cb.height+1);
    expect(cb.height).toBeGreaterThanOrEqual(100);
  }
  const list=page.locator('#pageList');
  expect(await list.evaluate(node=>node.scrollHeight>node.clientHeight)).toBe(true);
});

