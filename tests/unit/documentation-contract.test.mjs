import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('T20: v1 release documentation names the real limitations and required user files',()=>{
 const config=JSON.parse(fs.readFileSync('app.config.json','utf8'));assert.match(config.version,/^\d+\.\d+\.\d+$/);
 for(const path of ['README.md','README.ja.md','CHANGELOG.md','SECURITY.md','THIRD_PARTY_NOTICES.md','docs/RELEASE_CHECKLIST.md','assets/favicon.svg','assets/screenshot.png','assets/screenshot-mobile.png'])assert.equal(fs.existsSync(path),true,path);
 const en=fs.readFileSync('README.md','utf8'),ja=fs.readFileSync('README.ja.md','utf8');
 assert.match(en,/assets\/screenshot-en\.png/);assert.match(en,/PDF input is not supported/);assert.match(en,/not redaction/i);
 assert.match(ja,/PDF入力には対応しません/);assert.match(ja,/墨消しではありません/);
 for(const text of [en,ja]){assert.doesNotMatch(text,/supports OCR|cloud sync is available/i);assert.doesNotMatch(text,/all devices verified|全端末で確認済み/i);}
});

test('T20: release documentation matches the source version, WebP support and manual QA boundary',()=>{
 const config=JSON.parse(fs.readFileSync('app.config.json','utf8'));
 const version=config.version;
 const first=fs.readFileSync('README-FIRST.txt','utf8');
 const security=fs.readFileSync('SECURITY.md','utf8');
 const format=fs.readFileSync('docs/SAVE_FORMAT.md','utf8');
 const checklist=fs.readFileSync('docs/RELEASE_CHECKLIST.md','utf8');
 const matrix=fs.readFileSync('docs/QA_MATRIX.md','utf8');
 const releaseNotes=fs.readFileSync('docs/releases/v'+version+'.md','utf8');
 assert.ok(first.includes('Reveal Sheet v'+version));
 assert.ok(checklist.startsWith('# Reveal Sheet v'+version+' release checklist'));
 assert.ok(matrix.startsWith('# Reveal Sheet QA matrix — v'+version+' candidate'));
 assert.ok(format.includes('schemaVersion 1 and 2'));
 assert.ok(format.includes('"appVersion": "'+version+'"'));
 assert.ok(format.includes('image/webp'));
 assert.ok(security.includes('WebP') && security.includes('schemaVersion 1 or 2'));
 assert.ok(security.includes('Turning either persistence toggle OFF'));
 assert.ok(releaseNotes.includes('v'+version));
 assert.match(checklist,/Root cause still unknown|root cause \*\*not established\*\*/i);
 assert.match(checklist,/not performed/i);
 assert.doesNotMatch(first,/Cover editing, studying, saving and reopening sheets are NOT implemented yet/);
});
