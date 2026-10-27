// Focused informational-footer regression, not a release certification.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const cfg={"slug": "reveal-sheet", "bp": 767, "end": "helpOffline", "badge": "localBadge", "nav": ".reveal-nav"};
const evidence=path.resolve('test-results/mobile-footer');
async function main(){
 fs.mkdirSync(evidence,{recursive:true});const browser=await chromium.launch();
 try{for(const language of ['ja','en'])for(const [width,height,touch]of [[1360,900,false],[cfg.bp+1,568,false],[cfg.bp,568,false],[320,568,false],[360,640,false],[390,844,false],[393,252,false],...(cfg.slug==='photo-collage'?[[900,500,true]]:[])]){
 const context=await browser.newContext({viewport:{width,height},locale:language,reducedMotion:'reduce',hasTouch:touch});
 const page=await context.newPage(),errors=[],requests=[],label=`${language}-${width}x${height}${touch?'-coarse':''}`;
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 try{
 await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href);
 await page.locator('#helpButton').waitFor();
 if(await page.locator('html').getAttribute('lang')!==language)await page.locator('#languageButton').click();
 const headerVersion=page.locator('header .version-badge');
 assert.equal(await headerVersion.isVisible(),true,label+': header version is visible');
 assert.equal((await headerVersion.textContent()).trim(),'v'+JSON.parse(fs.readFileSync(path.resolve(__dirname,'../app.config.json'),'utf8')).version,label+': current version');
 assert.ok(await headerVersion.evaluate(el=>{const r=el.getBoundingClientRect();if(r.left<0||r.right>innerWidth||el.scrollWidth>el.clientWidth+1)return false;for(let p=el.parentElement;p;p=p.parentElement){if(/hidden|clip/.test(getComputedStyle(p).overflowX)){const b=p.getBoundingClientRect();if(r.left<b.left-1||r.right>b.right+1)return false;}}return true;}),label+': version is not clipped');
 const badge=page.locator('[data-i18n="'+cfg.badge+'"]');
 assert.equal((await badge.textContent()).trim(),language==='ja'?'完全ローカル処理':'Fully local processing');
 const phone=width<=cfg.bp||(cfg.slug==='photo-collage'&&touch&&height<=520);
 assert.equal(await page.locator('body > footer').isVisible(),!phone,label+': footer');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+': page width');
 if(cfg.slug!=='queue-board')assert.equal(await page.locator(cfg.nav).isVisible(),cfg.slug==='reveal-sheet'||phone,label+': functional navigation preserved');
 if([1360,320].includes(width))await page.screenshot({path:path.join(evidence,label+'.png')});
 await page.locator('#helpButton').click();
 await page.locator('#helpDialog .dialog-body').evaluate(el=>{el.scrollTop=el.scrollHeight;});
 const bounds=await page.locator('[data-i18n="'+cfg.end+'"]').evaluate(el=>{const range=document.createRange(),t=el.firstChild;range.setStart(t,t.textContent.length-1);range.setEnd(t,t.textContent.length);const r=range.getBoundingClientRect();let top=0,bottom=innerHeight;for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p);if(/auto|scroll|hidden|clip/.test(s.overflowY)){const b=p.getBoundingClientRect();top=Math.max(top,b.top);bottom=Math.min(bottom,b.bottom);}}return{top:r.top,bottom:r.bottom,clipTop:top,clipBottom:bottom};});
 assert.ok(bounds.top>=bounds.clipTop-1&&bounds.bottom<=bounds.clipBottom+1,label+': Help end reachable '+JSON.stringify(bounds));
 const header=await page.locator('#helpDialog .dialog-header').boundingBox();assert.ok(header&&header.y>=0&&header.y+header.height<=height,label+': Help header visible');
 await page.keyboard.press('Escape');assert.equal(await page.locator('#helpDialog').isVisible(),false,label+': Escape closes Help');
 await page.locator('#helpButton').click();await page.locator('#closeHelpButton').click();assert.equal(await page.locator('#helpDialog').isVisible(),false,label+': close');
 assert.deepEqual(errors,[],label+': runtime errors');assert.deepEqual(requests,[],label+': external requests');console.log('PASS '+label);
 }catch(error){await page.screenshot({path:path.join(evidence,'failure-'+label+'.png')}).catch(()=>{});throw error;}finally{await context.close();}
 }}finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
