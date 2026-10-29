import {test,expect} from '@playwright/test';
import {openApp,imagePath} from '../helpers/app.mjs';

test('T14: editable save keeps filename rules and reports save start rather than completion',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  await page.locator('#saveButton').click();
  await page.locator('#outputFilename').fill(' CON.reveal.html ');

  const firstPromise=page.waitForEvent('download');
  await page.locator('#downloadJsonButton').click();
  const first=await firstPromise;
  expect(first.suggestedFilename()).toBe('_CON.reveal.json');
  await expect(page.locator('#outputFilename')).toHaveValue('_CON');
  await expect(page.locator('#inputStatus')).toContainText(/保存を開始|Started saving/);
  await expect(page.locator('#inputStatus')).not.toContainText(/保存しました|Saved successfully|completed/i);

  const secondPromise=page.waitForEvent('download');
  await page.locator('#downloadJsonButton').click();
  const second=await secondPromise;
  expect(second.suggestedFilename()).toBe('_CON.reveal.json');
  await expect(page.locator('#pageList .page-item')).toHaveCount(1);
});

test('T14: a language switch in the same turn invalidates an in-progress export before download',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  await page.locator('#saveButton').click();
  await expect(page.locator('#downloadJsonButton')).toBeEnabled();
  await page.locator('#outputFilename').fill('language-switch');

  let downloads=0;
  page.on('download',()=>downloads++);
  await page.evaluate(()=>{
    document.querySelector('#downloadJsonButton').click();
    document.querySelector('#languageButton').click();
  });
  await expect(page.locator('#downloadJsonButton')).toBeEnabled();
  await expect(page.locator('#inputStatus')).toContainText(/破棄|discarded/i);
  expect(downloads).toBe(0);
  await expect(page.locator('#pageList .page-item')).toHaveCount(1);
});

test('T14: Blob preparation failure keeps the sheet and the user can retry',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  await page.evaluate(()=>{
    window.__RevealOriginalBlob=window.Blob;
    const Original=window.Blob;
    window.Blob=class extends Original{
      constructor(parts,options){
        if(String(options?.type||'').startsWith('application/json'))throw new Error('synthetic Blob failure');
        super(parts,options);
      }
    };
  });
  await page.locator('#saveButton').click();
  await expect(page.locator('#inputStatus')).toContainText(/保存する形式|Choose a format/i);
  await expect(page.locator('#saveJsonBytes')).toContainText(/保存時に計算|Calculated when saving/i);
  await expect(page.locator('.save-diagnostic-ready')).toBeVisible();
  await page.locator('#downloadJsonButton').click();
  await expect(page.locator('#inputStatus')).toContainText(/準備できません|Could not prepare/i);
  await expect(page.locator('#saveDiagnostics')).toBeVisible();
  await expect(page.locator('#saveDiagnosticText')).toContainText(/RS-SAVE-3.*JSON \/ PREPARE \/ EXPORT_FAILED \/ Error/);
  await expect(page.locator('#inputStatus')).toContainText(/RS-SAVE-3/);
  await expect(page.locator('#appToastMessage')).toContainText(/RS-SAVE-3/);
  await expect(page.locator('.save-diagnostic-ready')).toBeHidden();
  await expect(page.locator('#saveDiagnosticText')).not.toContainText(/static|\.png|reveal\.json/);
  await expect(page.locator('#pageList .page-item')).toHaveCount(1);

  await page.evaluate(()=>{window.Blob=window.__RevealOriginalBlob;delete window.__RevealOriginalBlob;});
  await expect(page.locator('#downloadJsonButton')).toBeEnabled();
  const retryPromise=page.waitForEvent('download');
  await page.locator('#downloadJsonButton').click();
  const retry=await retryPromise;
  expect(retry.suggestedFilename()).toMatch(/\.reveal\.json$/);
  await expect(page.locator('#inputStatus')).toContainText(/保存を開始|Started saving/);
  await expect(page.locator('#saveDiagnostics')).toBeHidden();
});


test('T14: HTML generation failure cannot prevent saving editable JSON',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  const points=await page.locator('#maskSvg').evaluate(svg=>{
    const matrix=svg.getScreenCTM();
    return [[22,20],[55,37]].map(([x,y])=>{
      const p=svg.createSVGPoint();p.x=x;p.y=y;
      const v=p.matrixTransform(matrix);return {x:v.x,y:v.y};
    });
  });
  await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();
  await page.mouse.move(points[1].x,points[1].y,{steps:5});await page.mouse.up();
  await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
  await page.evaluate(()=>{
    const Original=window.Blob;window.__RevealOriginalBlob=Original;
    window.Blob=class extends Original{
      constructor(parts,options){
        if(String(options?.type||'').startsWith('text/html'))throw new Error('synthetic HTML export failure');
        super(parts,options);
      }
    };
  });
  await page.locator('#saveButton').click();
  await expect(page.locator('#downloadJsonButton')).toBeEnabled();
  await expect(page.locator('#downloadHtmlButton')).toBeEnabled();
  const json=page.waitForEvent('download');
  await page.locator('#downloadJsonButton').click();
  const saved=await json;
  expect(saved.suggestedFilename()).toMatch(/\.reveal\.json$/);
  await page.locator('#downloadHtmlButton').click();
  await expect(page.locator('#inputStatus')).toContainText(/準備できません|Could not prepare/i);
  await expect(page.locator('#pageList .page-item')).toHaveCount(1);
  await page.evaluate(()=>{window.Blob=window.__RevealOriginalBlob;delete window.__RevealOriginalBlob;});
  const html=page.waitForEvent('download');
  await page.locator('#downloadHtmlButton').click();
  const savedHtml=await html;
  expect(savedHtml.suggestedFilename()).toMatch(/\.reveal\.html$/);
});


test('T14: failed browser download handoff shows a different, safe diagnosis',async({page})=>{
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  await page.locator('#saveButton').click();
  await page.evaluate(()=>{
    const original=URL.createObjectURL;window.__RevealOriginalCreateUrl=original;
    URL.createObjectURL=()=>{throw new DOMException('Blocked temporarily','SecurityError');};
  });
  await page.locator('#downloadJsonButton').click();
  await expect(page.locator('#saveDiagnostics')).toBeVisible();
  await expect(page.locator('#saveDiagnosticText')).toContainText(/JSON \/ DOWNLOAD \/ EXPORT_FAILED \/ SecurityError/);
  await expect(page.locator('#inputStatus')).toContainText(/ダウンロードを開始できませんでした|download could not start/i);
  await page.evaluate(()=>{URL.createObjectURL=window.__RevealOriginalCreateUrl;delete window.__RevealOriginalCreateUrl;});
  const downloaded=page.waitForEvent('download');
  await page.locator('#downloadJsonButton').click();
  const item=await downloaded;
  expect(item.suggestedFilename()).toMatch(/\.reveal\.json$/);
  await expect(page.locator('#saveDiagnostics')).toBeHidden();
});


test('T14: mobile Save error detail is visible above controls without searching below the fold',async({page})=>{
  await page.setViewportSize({width:390,height:780});
  await openApp(page);
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));
  await expect(page.locator('#previewImage')).toBeVisible();
  await page.locator('#saveButton').click();
  await expect(page.locator('.save-diagnostic-ready')).toBeVisible();
  await page.evaluate(()=>{
    const Original=window.Blob;
    window.__RevealOriginalBlob=Original;
    window.Blob=class extends Original{
      constructor(parts,options){
        if(String(options?.type||'').startsWith('application/json'))throw new RangeError('synthetic preparation failure');
        super(parts,options);
      }
    };
  });
  await page.locator('#downloadJsonButton').click();
  const details=page.locator('#saveDiagnostics');
  await expect(details).toBeVisible();
  await expect(details).toHaveAttribute('open','');
  await expect(page.locator('#saveDiagnosticText')).toContainText('JSON / PREPARE / EXPORT_FAILED / RangeError');
  await expect(page.locator('#appToastMessage')).toContainText('RS-SAVE-3');
  const box=await details.boundingBox();
  expect(box).not.toBeNull();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeLessThan(780);
  expect(await details.evaluate(node=>node.parentElement.querySelector('#savePanelTitle').compareDocumentPosition(node)&Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.evaluate(()=>{window.Blob=window.__RevealOriginalBlob;delete window.__RevealOriginalBlob;});
});
