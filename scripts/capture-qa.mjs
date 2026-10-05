// Capture actual generated UI, never a recreated UI or a production test hook.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { openApp } from '../tests/helpers/app.mjs';
const output='test-results/capture';mkdirSync(output,{recursive:true});
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
try {
 const page=await browser.newPage({viewport:{width:1360,height:900},locale:'en-US'});
 const requests=[],errors=[];page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
 await openApp(page);
 // Original synthetic worksheet created in Canvas solely as screenshot input.
 const data=await page.evaluate(()=>{
  const c=document.createElement('canvas');c.width=1200;c.height=750;const x=c.getContext('2d');
  x.fillStyle='#faf8f1';x.fillRect(0,0,c.width,c.height);x.fillStyle='#16624f';x.font='bold 19px sans-serif';x.fillText('SAMPLE SHEET  /  01',64,68);
  x.fillStyle='#26332e';x.font='bold 42px sans-serif';x.fillText('Parts of a desk lamp',64,130);x.font='21px sans-serif';x.fillStyle='#68746b';x.fillText('An original practice diagram. No personal information.',64,176);
  x.strokeStyle='#16624f';x.lineWidth=18;x.lineCap='round';x.beginPath();x.moveTo(370,583);x.lineTo(455,395);x.lineTo(353,263);x.stroke();
  x.fillStyle='#d4e3d7';x.beginPath();x.moveTo(300,255);x.lineTo(378,252);x.lineTo(439,326);x.lineTo(243,326);x.closePath();x.fill();x.stroke();
  x.fillStyle='#16624f';x.beginPath();x.ellipse(364,601,133,24,0,0,Math.PI*2);x.fill();
  x.lineWidth=2;x.strokeStyle='#9daea2';x.font='28px sans-serif';
  for(const [y,label,tx,ty] of [[294,'Shade',426,294],[426,'Arm',443,426],[584,'Base',468,584]]){
   x.beginPath();x.moveTo(tx,ty);x.lineTo(665,y);x.stroke();x.fillStyle='#fff';x.fillRect(682,y-33,325,66);x.fillStyle='#26332e';x.fillText(label,708,y+10);
  }
  x.font='17px sans-serif';x.fillStyle='#68746b';x.fillText('Image input preview — covers are added in a later development stage.',64,704);
  return c.toDataURL('image/png').split(',')[1];
 });
 await page.locator('#imageInput').setInputFiles({name:'practice-diagram.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
 await page.locator('#previewImage').waitFor({state:'visible'});
 await page.screenshot({path:output+'/screenshot-en.png'});
 await page.locator('#languageButton').click();await page.screenshot({path:output+'/screenshot.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:output+'/screenshot-mobile.png',fullPage:true});
 let commit='unknown';try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{}
 const result={commit,date:new Date().toISOString(),platform:os.platform(),release:os.release(),node:process.version,chromium:browser.version(),mode:process.env.APP_TEST_MODE||'file',externalRequests:requests,pageErrors:errors,realPhoneTest:false};
 writeFileSync(output+'/environment.json',JSON.stringify(result,null,2));
 if(requests.length||errors.length)throw new Error('Unexpected external request or page error during capture');
} finally {await browser.close();}
