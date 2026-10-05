// Deterministic, development-only synthetic fixtures. No third-party runtime.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../tests/fixtures/images/',import.meta.url));
const samples={
  "static.png": "iVBORw0KGgoAAAANSUhEUgAAAHgAAABQCAIAAABd+SbeAAAA2UlEQVR4nO3bsQ3AIBAEQXDl7hzXQDIIeaeC0+rTn2vcZ76nF+x7Tg/4i0IjhUYKjRQaKTRSaKTQSKGRQiOFRgqNFBopNFJopNBIoZFCI4VGCo0UGik0Umik0EihkUIjhUYKjRQaKTRSaKTQSKGRQiOFRgqNFBopNFJoZI5x36fhWvP0hG1dNFJopNBIoZFCI4VGCo0UGik0Umik0EihkUIjhUYKjRQaKTRSaKTQSKGRQiOFRgqNFBopNFJopNBIoZFCI4VGCo0UGik0Umik0EihkUIjhUYKjXzEWAUdQM8wdwAAAABJRU5ErkJggg==",
  "static.jpg": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYHCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wAARCABQAHgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD4vooor+Uz/fwKKKKACiiigApsnanU2TtTW5/JX06P+UWOIf8AuU/9TsMNoooqz/ngCiiigAooooAKKKKAJKKKKzP+tQKKKKACiiigApsnanU2TtTW5/JX06P+UWOIf+5T/wBTsMNoooqz/ngCiiigAooooAKKKKAJKK+Q6K/1Q/4pl/8AVV/+WP8A9+H+1n/FQz/qmf8Ay9/+9D68or5Doo/4pl/9VX/5Y/8A34H/ABUM/wCqZ/8AL3/70PryivkOij/imX/1Vf8A5Y//AH4H/FQz/qmf/L3/AO9D68psnavkWv2K/wCDTX/mvv8A3Kv/ALmK/APpR/Q//wCJavArN/Ef+2/r/wBQ+r/7P9W9h7T2+Ko4b+L9YrcvL7bn/hy5uXl0vzL868WfpT/8TBeH+N4B/sj6l9d9n+/+se25PY1aeI/h+wpc3N7Lk/iRtzc2tuV/FtF9JUV/kF/xM5/1Kf/ACv/APcT+Lv+Jd/+pn/5R/8Aup/NHRX9LlFH/Ezn/Up/8r//AHEP+Jd/+pn/AOUf/up/NHRX9LlFH/Ezn/Up/wDK/wD9xD/iXf8A6mf/AJR/+6n80dFf0uUUf8TOf9Sn/wAr/wD3EP8AiXf/AKmf/lH/AO6n8ddFFFf9qB5oUUUUAFFFFABX7Ff8Gmv/ADX3/uVf/cxX461+xX/Bpr/zX3/uVf8A3MV/AH7Uf/lBPi7/ALkP/Vpgj6rgn/kp8P8A9v8A/pEj9iqKKK/5Aj9+CiiigAooooAKKKKAP466KKK/7/D+VwooooAKKKKACv2K/wCDTX/mvv8A3Kv/ALmK/HWv2K/4NNf+a+/9yr/7mK/gD9qP/wAoJ8Xf9yH/AKtMEfVcE/8AJT4f/t//ANIkfsVRRRX/ACBH78FFFFABRRRQAUUUUAf/2Q==",
  "static.webp": "UklGRj4AAABXRUJQVlA4TDIAAAAvd8ATAB8gEEhSn3wNAUGR/6MJCIr8H23+gzujAJEAiSc96UkjBwgR/Z+A0lMjCR01Eg==",
  "lossy.webp": "UklGRqoAAABXRUJQVlA4IJ4AAAAQCQCdASp4AFAAPjEWikMiISEUZEggAwSxgGtS5n8A/ADTAfgB+pP8lpQH4AV3/uAADjRl1VVVQzTrUwc6AsrhVX+IblNpXNWQrjMzMnAAWRgA/veigs1qTGW/Bm/57q9mf/8JyT7t9qd+wGxcIeZleLL1rYsQAAL77OKo9v+a0xzNtHn//wnUIGJ0J1j5OWPkFROo8y2ruJKzQAAAAA==",
  "transparent.png": "iVBORw0KGgoAAAANSUhEUgAAAHgAAABQCAYAAADSm7GJAAAA6klEQVR4nO3c0QnEMAwFQTmVp3NfFRfDeqaCB4t+tWZm9syeS6z39IJvPTfFvdFzegD/JXCcwHECxwkcJ3CcwHECxwkcJ3CcwHECxwkcJ3CcwHECxwkcJ3CcwHECxwkcJ3CcwHECxwkcJ3CcwHECxwkcJ3CcwHECxwkcJ3CcwHECxwkcJ3CcwHECxwkcJ3DcmtlXvVHae52e8CkXHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxP7ATCRn4mjqHAAAAAElFTkSuQmCC",
  "transparent.webp": "UklGRkQAAABXRUJQVlA4TDcAAAAvd8ATECcgEEhSn3wNAUGR/6MJCIr8H23+A7gzChBkmDBk0FJIIX+vC7SI/k+Aww7ORSK48EcCAA==",
  "animated.png": "iVBORw0KGgoAAAANSUhEUgAAAHgAAABQCAIAAABd+SbeAAAACGFjVEwAAAACAAAAAPONk3AAAAAaZmNUTAAAAAAAAAB4AAAAUAAAAAAAAAAAAAEACgAAy5Az4QAAANlJREFUeJzt27ENwCAQBEFw5e4c10AyCHmngtPq059r3Ge+pxfse04P+ItCI4VGCo0UGik0Umik0EihkUIjhUYKjRQaKTRSaKTQSKGRQiOFRgqNFBopNFJopNBIoZFCI4VGCo0UGik0Umik0EihkUIjhUYKjRQaKTRSaGSOcd+n4Vrz9IRtXTRSaKTQSKGRQiOFRgqNFBopNFJopNBIoZFCI4VGCo0UGik0Umik0EihkUIjhUYKjRQaKTRSaKTQSKGRQiOFRgqNFBopNFJopNBIoZFCI4VGCo18xFgFHUDPMHcAAAAaZmNUTAAAAAEAAAB4AAAAUAAAAAAAAAAAAAEACgAAUOPZNQAAANtmZEFUAAAAAnic7dLBDcAgAAMx6ORsTmfo5xCqPUF0yhxrXGev0wu+e04P+AuhI0JHhI4IHRE6InRE6IjQEaEjQkeEjggdEToidEToiNARoSNCR4SOCB0ROiJ0ROiI0BGhI0JHhI4IHRE6InRE6IjQEaEjQkeEjggdEToidGTufXrCd3PeN9qjI0JHhI4IHRE6InRE6IjQEaEjQkeEjggdEToidEToiNARoSNCR4SOCB0ROiJ0ROiI0BGhI0JHhI4IHRE6InRE6IjQEaEjQkeEjggdEToidEToidEToyAv2OQWd2Xsj2QAAAABJRU5ErkJggg==",
  "animated.webp": "UklGRtwBAABXRUJQVlA4WAoAAAACAAAAdwAATwAAQU5JTQYAAAAAAAAAAABBTk1G2gAAAAAAAAAAAHcAAE8AAGQAAAJWUDggwgAAAHALAJ0BKngAUAA+bTKVRyQjIiEqaACADYljBigBC2AAfgBpgPwA/WD8YzQH4AV3/uAE92RryefNkP6/q8hgYu8n4mXlVjmQgu8a3/sVObxJjbSlIhDTqkqKupOK6itmMEuFzoAA/vCbQdl2gmN8yWR1t1jSv/kB+sOQZ6kvEluHd2vlTe1iAOp/KePuA2y3U0Xm86csK65kX9+0bD54fjXc6ILvR/+AgkLeDAV33xth2n0Beb/V2V76n5Fm8avGMAAAQU5NRs4AAAAAAAAAAAB3AABPAABkAAAAVlA4ILYAAAC0CgCdASp4AFAAPm0ylUcCpoAAANiWMGKAEO8cH8A/ADTAfgBRgPwArv/cAJ7sfFOlFiykO67dFBfp/Hr48Fg27GF2OTxbgFiZ32uHmlajJpmXeRLxuqgGXwcHMJAwAP7wsCkvj1KcjBVLVN57Jc6ejpcvjM0Vnof62rdASL+TE25AtOsIoyvSak0XwVgD//35QhhPqxXf3yqEmv+/kzgU/9pmqRflp8elNcOwu2U7WvgFa5QAAA=="
};
export function prepareFixtures() {
 fs.mkdirSync(root,{recursive:true});
 const write=(name,bytes)=>{const file=path.join(root,name);if(!fs.existsSync(file))fs.writeFileSync(file,bytes);};
 for(const [name,value] of Object.entries(samples))write(name,Buffer.from(value,'base64'));
 const jpeg=Buffer.from(samples['static.jpg'],'base64');
 for(let n=1;n<=8;n++){
  // EXIF APP1, big-endian TIFF, one SHORT orientation entry.
  const app1=Buffer.from('ffe100224578696600004d4d002a00000008000101120003000000010001000000000000','hex');
  app1.writeUInt16BE(n,28);
  write(`orientation-${n}.jpg`,Buffer.concat([jpeg.subarray(0,2),app1,jpeg.subarray(2)]));
 }
 write('unsupported.gif',Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==','base64'));
 write('unsupported.svg',Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.invalid/private"/></svg>'));
 write('empty.png',Buffer.alloc(0));
 for(const [ext,len] of [['png',30],['jpg',100],['webp',24]])write('truncated.'+ext,Buffer.from(samples['static.'+ext],'base64').subarray(0,len));
 const large=Buffer.from(samples['static.png'],'base64');large.writeUInt32BE(8192,16);large.writeUInt32BE(2000,20);
 let crc=0xffffffff;for(const byte of large.subarray(12,29)){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 large.writeUInt32BE((crc^0xffffffff)>>>0,29);write('oversize-header.png',large);
}
prepareFixtures();
