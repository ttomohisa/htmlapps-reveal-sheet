// Capture the actual generated UI with original synthetic study material.
// This is a QA/release-documentation helper, not a production test hook.
import { chromium } from 'playwright';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { openApp } from '../tests/helpers/app.mjs';

const output='test-results/capture';
mkdirSync(output,{recursive:true});
const requests=[],errors=[];
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});

function watch(page){
 page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});
 page.on('pageerror',error=>errors.push(error.message));
}
async function setLanguage(page,language){
 for(let attempt=0;attempt<3;attempt++){
  const current=await page.locator('html').getAttribute('lang');
  if(current===language)return;
  await page.locator('#languageButton').click();
 }
 throw new Error('Could not switch Reveal Sheet language to '+language);
}
async function syntheticWorksheet(page){
 return page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=1200;c.height=750;const x=c.getContext('2d');
  x.fillStyle='#faf8f1';x.fillRect(0,0,c.width,c.height);
  x.fillStyle='#16624f';x.font='bold 19px sans-serif';x.fillText('SAMPLE SHEET / 01',64,68);
  x.fillStyle='#26332e';x.font='bold 42px sans-serif';x.fillText('Parts of a desk lamp',64,130);
  x.font='21px sans-serif';x.fillStyle='#68746b';x.fillText('Cover each label, then reveal it from memory.',64,176);
  x.strokeStyle='#16624f';x.lineWidth=18;x.lineCap='round';x.beginPath();x.moveTo(370,583);x.lineTo(455,395);x.lineTo(353,263);x.stroke();
  x.fillStyle='#d4e3d7';x.beginPath();x.moveTo(300,255);x.lineTo(378,252);x.lineTo(439,326);x.lineTo(243,326);x.closePath();x.fill();x.stroke();
  x.fillStyle='#16624f';x.beginPath();x.ellipse(364,601,133,24,0,0,Math.PI*2);x.fill();
  x.lineWidth=2;x.strokeStyle='#9daea2';x.font='28px sans-serif';
  for(const [y,label,tx,ty] of [[294,'Shade',426,294],[426,'Arm',443,426],[584,'Base',468,584]]){
   x.beginPath();x.moveTo(tx,ty);x.lineTo(665,y);x.stroke();x.fillStyle='#fff';x.fillRect(682,y-33,325,66);x.fillStyle='#26332e';x.fillText(label,708,y+10);
  }
  x.font='17px sans-serif';x.fillStyle='#68746b';x.fillText('Original practice diagram — no personal information.',64,704);
  return c.toDataURL('image/png').split(',')[1];
 });
}
async function imagePoint(page,x,y){
 return page.locator('#maskSvg').evaluate((svg,point)=>{
  const p=svg.createSVGPoint();p.x=point.x;p.y=point.y;
  const out=p.matrixTransform(svg.getScreenCTM());return{x:out.x,y:out.y};
 },{x,y});
}
async function dragCover(page,a,b){
 const p1=await imagePoint(page,...a),p2=await imagePoint(page,...b);
 await page.mouse.move(p1.x,p1.y);await page.mouse.down();await page.mouse.move(p2.x,p2.y,{steps:6});await page.mouse.up();
}
async function prepareSheet(page,language){
 watch(page);await openApp(page);await setLanguage(page,language);
 const data=await syntheticWorksheet(page);
 await page.locator('#imageInput').setInputFiles({name:'practice-diagram.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
 await page.locator('#previewImage').waitFor({state:'visible'});
 const title=page.locator('#pageList .page-item').first().locator('.page-card-title');
 await title.fill(language==='ja'?'デスクランプの部品':'Desk lamp parts');await title.press('Enter');
 await dragCover(page,[682,261],[1007,327]);
 await dragCover(page,[682,393],[1007,459]);
 await dragCover(page,[682,551],[1007,617]);
}

try {
 const ja=await browser.newPage({viewport:{width:1360,height:900},locale:'ja-JP'});
 await prepareSheet(ja,'ja');await ja.screenshot({path:output+'/screenshot.png'});await ja.close();

 const en=await browser.newPage({viewport:{width:1360,height:900},locale:'en-US'});
 await prepareSheet(en,'en');await en.screenshot({path:output+'/screenshot-en.png'});await en.close();

 const mobile=await browser.newPage({viewport:{width:390,height:844},locale:'ja-JP'});
 await prepareSheet(mobile,'ja');
 await mobile.locator('#studyButton').click();await mobile.locator('#guidedModeButton').click();
 if(await mobile.locator('#appConfirmDialog').isVisible())await mobile.locator('#appConfirmOk').click();
 await mobile.screenshot({path:output+'/screenshot-mobile.png',fullPage:true});await mobile.close();

 if(process.env.CAPTURE_UPDATE_ASSETS==='1'){
  copyFileSync(output+'/screenshot.png','assets/screenshot.png');
  copyFileSync(output+'/screenshot-en.png','assets/screenshot-en.png');
  copyFileSync(output+'/screenshot-mobile.png','assets/screenshot-mobile.png');
 }

 let commit='unknown';try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{}
 const result={commit,date:new Date().toISOString(),platform:os.platform(),release:os.release(),node:process.version,chromium:browser.version(),mode:process.env.APP_TEST_MODE||'file',externalRequests:requests,pageErrors:errors,realPhoneTest:false};
 writeFileSync(output+'/environment.json',JSON.stringify(result,null,2));
 if(requests.length||errors.length)throw new Error('Unexpected external request or page error during capture');
} finally {
 await browser.close();
}
