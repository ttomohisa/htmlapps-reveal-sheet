import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { loadFactory, testContext, toPlain } from '../helpers/load-factory.mjs';
test('T01: core declares the specification limits without browser globals', () => {
  const core = loadFactory('src/reveal/core.js','createRevealCore')();
  assert.equal(core.limits.maxPages, 30);
  assert.equal(core.limits.maxMasks, 1000);
  assert.equal(core.limits.maxInputBytes, 20 * 1024 ** 2);
  assert.equal(core.limits.maxPixels, 16000000);
});
test('T01: a new document contains no assets, session or original filenames', () => {
  const core = loadFactory('src/reveal/core.js','createRevealCore')();
  const doc = core.newDocument(testContext());
  assert.deepEqual(toPlain(doc.pages), []);
  assert.deepEqual(toPlain(doc.assets), []);
  assert.deepEqual(toPlain(doc.questions), []);
  assert.deepEqual(toPlain(doc.masks), []);
  assert.equal(doc.revision, 1);
  assert.equal(doc.title, 'Untitled sheet');
  assert.deepEqual(toPlain(doc.defaults), {mode:'free',otherAnswers:'hidden'});
  assert.equal(Object.hasOwn(doc,'ratings'),false);
});
test('T01: exact declared assembly markers and no runtime dependencies', () => {
  const source = fs.readFileSync('src/index.template.html','utf8');
  for (const marker of ['__APP_CONFIG_JSON__','__BUILD_MANIFEST_JSON__','__EMBEDDED_ASSET_BUNDLE_JSON__','/* REVEAL:APP_JS */','/* REVEAL:SHARED_CSS */','__REVEAL_PLAYER_TEMPLATE_JSON__']) {
    assert.equal(source.split(marker).length - 1,1,marker);
  }
  assert.equal(source.split('__APP_ICON_DATA_URI__').length-1,2);
  assert.equal(JSON.parse(fs.readFileSync('dependencies.json','utf8')).dependencies.length,0);
});

test('T01: all assembled Reveal JavaScript sources parse', () => {
  for (const name of ['core.js','image-io.js','project-io.js','persistence.js','study-view.js','player.js','editor.js']) {
    const source=fs.readFileSync('src/reveal/'+name,'utf8');
    assert.doesNotThrow(()=>new vm.Script(source,{filename:name}),name);
  }
});

test('T01: lesson player template keeps one fixed non-executing data tag',()=>{
  const source=fs.readFileSync('src/player.template.html','utf8');
  assert.equal(source.split('<script id="reveal-sheet-data" type="application/json">').length-1,1);
  assert.equal(source.split('__REVEAL_LESSON_JSON__').length-1,1);
  assert.equal(source.split('/* REVEAL:PLAYER_RUNTIME */').length-1,1);
  assert.equal(source.split('__REVEAL_PLAYER_RUNTIME_CSP_HASH__').length-1,1);
  assert.equal(source.split('__REVEAL_PLAYER_RUNTIME_SHA256__').length-1,1);
  assert.equal(source.split('__APP_ICON_DATA_URI__').length-1,2);
});
