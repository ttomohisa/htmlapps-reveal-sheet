import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('T20: v1 release documentation names the real limitations and required user files',()=>{
 const config=JSON.parse(fs.readFileSync('app.config.json','utf8'));assert.equal(config.version,'1.0.1');
 for(const path of ['README.md','README.ja.md','CHANGELOG.md','SECURITY.md','THIRD_PARTY_NOTICES.md','docs/RELEASE_CHECKLIST.md','assets/favicon.svg','assets/screenshot.png','assets/screenshot-mobile.png'])assert.equal(fs.existsSync(path),true,path);
 const en=fs.readFileSync('README.md','utf8'),ja=fs.readFileSync('README.ja.md','utf8');
 assert.match(en,/assets\/screenshot-en\.png/);assert.match(en,/PDF input is not supported/);assert.match(en,/not redaction/i);
 assert.match(ja,/PDF入力には対応しません/);assert.match(ja,/墨消しではありません/);
 for(const text of [en,ja]){assert.doesNotMatch(text,/supports OCR|cloud sync is available/i);assert.doesNotMatch(text,/all devices verified|全端末で確認済み/i);}
});
