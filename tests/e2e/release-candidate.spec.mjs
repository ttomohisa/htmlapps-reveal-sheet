import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {openApp} from '../helpers/app.mjs';

const png=readFileSync('tests/fixtures/images/static.png');
function makeEnvelope(pageCount,maskCount){
  const asset={id:'asset_1',mime:'image/png',width:120,height:80,byteLength:png.length,dataBase64:png.toString('base64')};
  const pages=Array.from({length:pageCount},(_,i)=>({id:`page_${i+1}`,title:`Page ${i+1}`,description:'',imageId:asset.id,questionOrder:[]}));
  const questions=[],masks=[];
  for(let i=0;i<maskCount;i++){const page=pages[i%pages.length],qid=`question_${i+1}`,mid=`mask_${i+1}`;page.questionOrder.push(qid);questions.push({id:qid,pageId:page.id,revision:1,maskIds:[mid],prompt:'',answer:''});masks.push({id:mid,pageId:page.id,kind:'answer',questionId:qid,rect:{x:.1,y:.1,w:.2,h:.2}});}
  return {format:'reveal-sheet',schemaVersion:1,appVersion:'0.9.0',kind:'editable',document:{id:'document_resource',revision:1,title:'Release candidate fixture',defaults:{mode:'free',otherAnswers:'hidden'},pages,assets:[asset],questions,masks}};
}
async function importEnvelope(page,envelope,name='fixture.reveal.json'){await page.locator('#sheetInput').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(envelope))});}

test('T18: standard sheet round-trips repeatedly without accumulating document items',async({page})=>{
  await openApp(page);const standard=makeEnvelope(10,100);await importEnvelope(page,standard,'standard.reveal.json');
  await expect(page.locator('#pageList button')).toHaveCount(10);await expect(page.locator('#coverList .cover-list-item')).toHaveCount(10);
  for(let cycle=0;cycle<3;cycle++){
    await page.locator('#saveButton').click();const dl=page.waitForEvent('download');await page.locator('#downloadJsonButton').click();const download=await dl;
    const saved=JSON.parse(readFileSync(await download.path(),'utf8'));expect(saved.document.pages).toHaveLength(10);expect(saved.document.masks).toHaveLength(100);
    await page.locator('#createButton').click();await importEnvelope(page,saved,`roundtrip-${cycle}.reveal.json`);
    await expect(page.locator('#appConfirmDialog')).toBeVisible();await page.locator('#appConfirmOk').click();
    await expect(page.locator('#pageList button')).toHaveCount(10);await expect(page.locator('#coverList .cover-list-item')).toHaveCount(10);
  }
});

test('T18: 30 pages / 1000 covers import is observed and over-limit replacement preserves current work',async({page},testInfo)=>{
  await openApp(page);const upper=makeEnvelope(30,1000),started=performance.now();await importEnvelope(page,upper,'upper.reveal.json');
  await expect(page.locator('#pageList button')).toHaveCount(30);
  const elapsedMs=Math.round(performance.now()-started);
  const browserMemory=await page.evaluate(()=>globalThis.performance?.memory?{usedJSHeapSize:globalThis.performance.memory.usedJSHeapSize,totalJSHeapSize:globalThis.performance.memory.totalJSHeapSize,jsHeapSizeLimit:globalThis.performance.memory.jsHeapSizeLimit}:null);
  await testInfo.attach('resource-observation.json',{body:Buffer.from(JSON.stringify({pages:30,masks:1000,elapsedMs,browserMemory},null,2)),contentType:'application/json'});
  const over=structuredClone(upper);over.document.pages.push({id:'page_31',title:'Page 31',description:'',imageId:'asset_1',questionOrder:[]});
  await importEnvelope(page,over,'over-limit.reveal.json');await expect(page.locator('#appConfirmDialog')).toBeHidden();await expect(page.locator('#inputStatus')).toContainText(/limit|上限/i);await expect(page.locator('#pageList button')).toHaveCount(30);
  await page.locator('#saveButton').click();await expect(page.locator('#downloadJsonButton')).toBeEnabled();
});
