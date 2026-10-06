import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {openApp,imagePath} from '../helpers/app.mjs';

const START='<script id="reveal-sheet-data" type="application/json">';
async function imagePoint(page,x,y){return page.locator('#maskSvg').evaluate((svg,point)=>{const p=svg.createSVGPoint();p.x=point.x;p.y=point.y;const out=p.matrixTransform(svg.getScreenCTM());return{x:out.x,y:out.y};},{x,y});}
async function addCover(page,a,b){await page.locator('#coverButton').click();const p1=await imagePoint(page,...a),p2=await imagePoint(page,...b);await page.mouse.move(p1.x,p1.y);await page.mouse.down();await page.mouse.move(p2.x,p2.y);await page.mouse.up();}
async function makeLesson(page,testInfo){
  await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();await addCover(page,[18,18],[54,38]);
  await page.locator('#saveButton').click();const dl=page.waitForEvent('download');await page.locator('#downloadHtmlButton').click();const download=await dl,path=testInfo.outputPath('source.reveal.html');await download.saveAs(path);return {path,html:readFileSync(path,'utf8')};
}
function hostileOuter(html){
  const hostile='<meta http-equiv="refresh" content="0;url=https://invalid.example/refresh"><img src="https://invalid.example/image.png"><iframe src="https://invalid.example/frame"></iframe><style>body{background:url(https://invalid.example/style.png)}</style><script>globalThis.__lessonOuterExecuted=true;fetch("https://invalid.example/script")</script>';
  return html.replace('<body',hostile+'<body');
}

test('T12: lesson HTML is re-opened as data without executing hostile outer markup',async({page},testInfo)=>{
  await openApp(page);const lesson=await makeLesson(page,testInfo);
  await expect(page.locator('#sheetInput')).toHaveAttribute('accept',/\.reveal\.html/);
  const requests=[];page.on('request',request=>{if(/^https?:/i.test(request.url()))requests.push(request.url());});
  await page.evaluate(()=>{window.__domParserCalls=0;try{window.DOMParser=class{constructor(){window.__domParserCalls++;throw new Error('DOMParser forbidden');}};}catch{}});
  const hostile=hostileOuter(lesson.html);
  await page.locator('#createButton').click();
  await page.locator('#sheetInput').setInputFiles({name:'hostile.reveal.html',mimeType:'text/html',buffer:Buffer.from(hostile)});
  await expect(page.locator('#appConfirmDialog')).toBeVisible();
  expect(requests).toEqual([]);expect(await page.evaluate(()=>window.__lessonOuterExecuted)).toBeUndefined();expect(await page.evaluate(()=>window.__domParserCalls)).toBe(0);
  await page.locator('#appConfirmOk').click();
  await expect(page.locator('#pageList button')).toHaveCount(1);await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);await expect(page.locator('#previewImage')).toBeVisible();
});

test('T12: duplicate lesson data tag is rejected before replacement and current sheet survives',async({page},testInfo)=>{
  await openApp(page);const lesson=await makeLesson(page,testInfo);
  const start=lesson.html.indexOf(START),end=lesson.html.indexOf('</script>',start+START.length),block=lesson.html.slice(start,end+9),duplicate=lesson.html.replace('</body>',block+'</body>');
  await page.locator('#createButton').click();await expect(page.locator('#pageList button')).toHaveCount(1);
  await page.locator('#sheetInput').setInputFiles({name:'duplicate.reveal.html',mimeType:'text/html',buffer:Buffer.from(duplicate)});
  await expect(page.locator('#appConfirmDialog')).toBeHidden();await expect(page.locator('#inputStatus')).toContainText(/could not|開けません|invalid/i);
  await expect(page.locator('#pageList button')).toHaveCount(1);await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);
});

test('T12: malformed lesson HTML never uses outer markup as a fallback',async({page},testInfo)=>{
  await openApp(page);const lesson=await makeLesson(page,testInfo),start=lesson.html.indexOf(START),end=lesson.html.indexOf('</script>',start+START.length);
  const cut=lesson.html.slice(0,end);
  await page.locator('#sheetInput').setInputFiles({name:'cut.reveal.html',mimeType:'text/html',buffer:Buffer.from(cut)});
  await expect(page.locator('#appConfirmDialog')).toBeHidden();await expect(page.locator('#inputStatus')).toContainText(/could not|開けません|invalid/i);
  await expect(page.locator('#pageList button')).toHaveCount(1);
});
