// Deterministic synthetic fixtures, independent of the app's image reader.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';
import {jpegFixture} from '../tests/fixtures/jpeg-fixture.mjs';
const root=fileURLToPath(new URL('../tests/fixtures/images/',import.meta.url));
const jpeg=Buffer.from(jpegFixture,'base64');
const webps={
 'static.webp':'UklGRj4AAABXRUJQVlA4TDIAAAAvd8ATAB8gEEhSn3wNAUGR/6MJCIr8H23+gzujAJEAiSc96UkjBwgR/Z+A0lMjCR01Eg==',
 'transparent.webp':'UklGRkQAAABXRUJQVlA4TDcAAAAvd8ATECcgEEhSn3wNAUGR/6MJCIr8H23+A7gzChBkmDBk0FJIIX+vC7SI/k+Aww7ORSK48EcCAA==',
 'lossy.webp':'UklGRqoAAABXRUJQVlA4IJ4AAAAQCQCdASp4AFAAPjEWikMiISEUZEggAwSxgGtS5n8A/ADTAfgB+pP8lpQH4AV3/uAADjRl1VVVQzTrUwc6AsrhVX+IblNpXNWQrjMzMnAAWRgA/veigs1qTGW/Bm/57q9mf/8JyT7t9qd+wGxcIeZleLL1rYsQAAL77OKo9v+a0xzNtHn//wnUIGJ0J1j5OWPkFROo8y2ruJKzQAAAAA==',
 'animated.webp':'UklGRtwBAABXRUJQVlA4WAoAAAACAAAAdwAATwAAQU5JTQYAAAAAAAAAAABBTk1G2gAAAAAAAAAAAHcAAE8AAGQAAAJWUDggwgAAAHALAJ0BKngAUAA+bTKVRyQjIiEqaACADYljBigBC2AAfgBpgPwA/WD8YzQH4AV3/uAE92RryefNkP6/q8hgYu8n4mXlVjmQgu8a3/sVObxJjbSlIhDTqkqKupOK6itmMEuFzoAA/vCbQdl2gmN8yWR1t1jSv/kB+sOQZ6kvEluHd2vlTe1iAOp/KePuA2y3U0Xm86csK65kX9+0bD54fjXc6ILvR/+AgkLeDAV33xth2n0Beb/V2V76n5Fm8avGMAAAQU5NRs4AAAAAAAAAAAB3AABPAABkAAAAVlA4ILYAAAC0CgCdASp4AFAAPm0ylUcCpoAAANiWMGKAEO8cH8A/ADTAfgBRgPwArv/cAJ7sfFOlFiykO67dFBfp/Hr48Fg27GF2OTxbgFiZ32uHmlajJpmXeRLxuqgGXwcHMJAwAP7wsCkvj1KcjBVLVN57Jc6ejpcvjM0Vnof62rdASL+TE25AtOsIoyvSak0XwVgD//35QhhPqxXf3yqEmv+/kzgU/9pmqRflp8elNcOwu2U7WvgFa5QAAA=='
};
const signature=Buffer.from('89504e470d0a1a0a','hex');
function chunk(type,data=Buffer.alloc(0)){
 const length=Buffer.alloc(4);length.writeUInt32BE(data.length);
 const body=Buffer.concat([Buffer.from(type),data]);let crc=0xffffffff;
 for(const byte of body){crc^=byte;for(let b=0;b<8;b++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 const end=Buffer.alloc(4);end.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([length,body,end]);
}
function header(w=120,h=80){const b=Buffer.alloc(13);b.writeUInt32BE(w);b.writeUInt32BE(h,4);b[8]=8;b[9]=6;return chunk('IHDR',b);}
function pixels(alpha=false,offset=0){
 const raw=Buffer.alloc(80*(120*4+1));const colors=[[255,0,0],[0,128,0],[0,0,255],[255,255,0]];
 for(let y=0;y<80;y++)for(let x=0;x<120;x++){
  const at=y*481+1+x*4,col=colors[((x>=60?1:0)+(y>=40?2:0)+offset)%4];
  raw.set(col,at);raw[at+3]=alpha&&x<10&&y<10?0:255;
 }
 return deflateSync(raw);
}
function frame(seq){const b=Buffer.alloc(26);b.writeUInt32BE(seq);b.writeUInt32BE(120,4);b.writeUInt32BE(80,8);b.writeUInt16BE(1,20);b.writeUInt16BE(10,22);return chunk('fcTL',b);}
export function prepareFixtures(){
 fs.mkdirSync(root,{recursive:true});
 const samples={'static.jpg':jpeg};
 for(const [name,value] of Object.entries(webps))samples[name]=Buffer.from(value,'base64');
 for(const alpha of [false,true])samples[alpha?'transparent.png':'static.png']=Buffer.concat([signature,header(),chunk('IDAT',pixels(alpha)),chunk('IEND')]);
 const ac=Buffer.alloc(8);ac.writeUInt32BE(2);const seq=Buffer.alloc(4);seq.writeUInt32BE(2);
 samples['animated.png']=Buffer.concat([signature,header(),chunk('acTL',ac),frame(0),chunk('IDAT',pixels()),frame(1),chunk('fdAT',Buffer.concat([seq,pixels(false,1)])),chunk('IEND')]);
 for(let n=1;n<=8;n++){
  const app1=Buffer.from('ffe100224578696600004d4d002a00000008000101120003000000010001000000000000','hex');app1.writeUInt16BE(n,28);
  samples[`orientation-${n}.jpg`]=Buffer.concat([jpeg.subarray(0,2),app1,jpeg.subarray(2)]);
 }
 samples['unsupported.gif']=Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==','base64');
 samples['unsupported.svg']=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.invalid/private"/></svg>');
 samples['empty.png']=Buffer.alloc(0);
 for(const [ext,len] of [['png',30],['jpg',100],['webp',24]])samples['truncated.'+ext]=samples['static.'+ext].subarray(0,len);
 samples['oversize-header.png']=Buffer.concat([signature,header(8192,2000),chunk('IDAT',pixels()),chunk('IEND')]);
 for(const [name,bytes] of Object.entries(samples)){
  const file=path.join(root,name);if(fs.existsSync(file)&&fs.readFileSync(file).equals(bytes))continue;
  // Unit test workers can import this helper concurrently. Publish whole files.
  const tmp=file+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,bytes);fs.renameSync(tmp,file);
 }
}
prepareFixtures();
