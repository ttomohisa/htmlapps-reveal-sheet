import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {imagePath} from '../helpers/app.mjs';

async function startAppServer(){
  const variant=process.env.APP_VARIANT||'readable',file=variant==='self-extract'?'index.self-extract.html':'index.html';
  const html=readFileSync(resolve(process.env.ARTIFACT_DIR||'dist',file));
  const server=createServer((request,response)=>{
    if(request.url==='/'||request.url==='/index.html'){response.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});response.end(html);return;}
    response.writeHead(404,{'content-type':'text/plain'});response.end('not found');
  });
  await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
  const address=server.address(),url=`http://127.0.0.1:${address.port}/`;
  return {url,close:()=>new Promise(ok=>server.close(ok))};
}
async function imagePoint(page,x,y){return page.locator('#maskSvg').evaluate((svg,point)=>{const p=svg.createSVGPoint();p.x=point.x;p.y=point.y;const out=p.matrixTransform(svg.getScreenCTM());return{x:out.x,y:out.y};},{x,y});}
async function addCover(page){await page.locator('#coverButton').click();const a=await imagePoint(page,18,18),b=await imagePoint(page,54,38);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y);await page.mouse.up();}
function verifyLessonHash(html){
  const csp=html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1]||'';
  const hex=html.match(/<meta name="reveal-player-runtime-sha256" content="([a-f0-9]{64})">/)?.[1]||'';
  const runtime=html.match(/<script id="reveal-sheet-data" type="application\/json">[\s\S]*?<\/script>\s*<script>([\s\S]*?)<\/script>/)?.[1];
  expect(runtime).toBeTruthy();
  const digest=createHash('sha256').update(runtime,'utf8').digest();
  expect(hex).toBe(digest.toString('hex'));
  expect(csp).toContain(`script-src 'sha256-${digest.toString('base64')}'`);
  expect(csp).not.toContain("script-src 'unsafe-inline'");
  expect(csp).toContain("connect-src 'none'");expect(csp).toContain("frame-src 'none'");
  return true;
}

test('T17: HTTP app, exported lesson and hostile lesson import make no post-load external requests',async({page,context},testInfo)=>{
  const server=await startAppServer(),postLoadHttpRequests=[];
  try{
    let initialDocumentSeen=false;
    page.on('request',request=>{
      if(!/^https?:/i.test(request.url()))return;
      if(!initialDocumentSeen&&request.isNavigationRequest()&&request.resourceType()==='document'&&request.url()===server.url){initialDocumentSeen=true;return;}
      postLoadHttpRequests.push(request.url());
    });
    await page.goto(server.url);await page.locator('#addButton').waitFor({state:'visible'});
    expect(initialDocumentSeen).toBe(true);expect(postLoadHttpRequests).toEqual([]);
    await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();await addCover(page);
    await page.locator('#saveButton').click();const dl=page.waitForEvent('download');await page.locator('#downloadHtmlButton').click();const download=await dl,lessonPath=testInfo.outputPath('security-audit.reveal.html');await download.saveAs(lessonPath);
    const lessonHtml=readFileSync(lessonPath,'utf8');expect(verifyLessonHash(lessonHtml)).toBe(true);expect(postLoadHttpRequests).toEqual([]);
    const lesson=await context.newPage(),lessonRequests=[];lesson.on('request',request=>{if(/^https?:/i.test(request.url()))lessonRequests.push(request.url());});
    await lesson.goto(pathToFileURL(lessonPath).href);await lesson.locator('#lessonReady').waitFor({state:'visible'});expect(lessonRequests).toEqual([]);await lesson.close();
    const hostile=`<link rel="stylesheet" href="https://invalid.example/leak.css"><img src="https://invalid.example/leak.png"><iframe src="https://invalid.example/leak-frame"></iframe><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cscript%3Eparent.__dataSvgExecuted=true%3C/script%3E%3C/svg%3E"><script>globalThis.__outerExecuted=true;fetch('https://invalid.example/leak-script')</script>`+lessonHtml;
    await page.locator('#createButton').click();await page.locator('#sheetInput').setInputFiles({name:'hostile.reveal.html',mimeType:'text/html',buffer:Buffer.from(hostile)});
    await expect(page.locator('#appConfirmDialog')).toBeVisible();
    expect(await page.evaluate(()=>globalThis.__outerExecuted)).toBeUndefined();expect(await page.evaluate(()=>globalThis.__dataSvgExecuted)).toBeUndefined();expect(postLoadHttpRequests).toEqual([]);
    await page.locator('#appConfirmOk').click();await expect(page.locator('#pageList button')).toHaveCount(1);await expect(page.locator('#maskSvg .mask-rect')).toHaveCount(1);expect(postLoadHttpRequests).toEqual([]);
  }finally{await server.close();}
});

test('T17: a data-SVG payload disguised as a stored PNG is rejected atomically',async({page})=>{
  const server=await startAppServer();
  try{
    await page.goto(server.url);await page.locator('#addButton').waitFor({state:'visible'});
    await page.locator('#imageInput').setInputFiles(imagePath('static.png'));await expect(page.locator('#previewImage')).toBeVisible();
    const value=JSON.parse(readFileSync('tests/fixtures/sheets/v0.6.0.reveal.json','utf8'));
    const svg=Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>fetch('https://invalid.example/x')</script></svg>");
    value.document.assets[0].byteLength=svg.length;value.document.assets[0].dataBase64=svg.toString('base64');
    await page.locator('#sheetInput').setInputFiles({name:'svg-as-png.reveal.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
    await expect(page.locator('#appConfirmDialog')).toBeHidden();await expect(page.locator('#inputStatus')).toContainText(/could not open|開けません|invalid/i);
    await expect(page.locator('#pageList button')).toHaveCount(1);await expect(page.locator('#previewImage')).toBeVisible();
  }finally{await server.close();}
});
