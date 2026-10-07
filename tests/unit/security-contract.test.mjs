import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadFactory} from '../helpers/load-factory.mjs';

const core=loadFactory('src/reveal/core.js','createRevealCore')();
const createProjectIO=loadFactory('src/reveal/project-io.js','createProjectIO');
function project(){return createProjectIO({core,imageIO:{verifyStoredAsset:async()=>{}},env:{Blob,TextDecoder,TextEncoder}});}

test('T17 lesson source requires a fixed runtime CSP hash instead of unsafe-inline',()=>{
  const template=readFileSync('src/player.template.html','utf8');
  const assembler=readFileSync('scripts/assemble-reveal.ps1','utf8');
  assert.match(template,/script-src '__REVEAL_PLAYER_RUNTIME_CSP_HASH__'/);
  assert.doesNotMatch(template,/script-src 'unsafe-inline'/);
  assert.equal((template.match(/\/\* REVEAL:PLAYER_RUNTIME \*\//g)||[]).length,1);
  assert.equal((template.match(/__REVEAL_PLAYER_RUNTIME_SHA256__/g)||[]).length,1);
  assert.equal((template.match(/__REVEAL_PLAYER_RUNTIME_CSP_HASH__/g)||[]).length,1);
  assert.match(assembler,/\[Convert\]::ToBase64String\(\$playerHashBytes\)/);
  assert.match(assembler,/"\/\* REVEAL:PLAYER_RUNTIME \*\/" = \$playerRuntime/);
  assert.match(assembler,/"__REVEAL_PLAYER_RUNTIME_CSP_HASH__" = \$playerCspHash/);
});

test('T17 oversized incoming lesson HTML is rejected before bytes are read',async()=>{
  const io=project();let reads=0;
  const file={name:'huge.reveal.html',type:'text/html',size:core.limits.maxHtmlBytes+1,arrayBuffer:async()=>{reads++;throw new Error('must not read');}};
  await assert.rejects(io.readHtml(file),error=>error?.code==='LIMIT_EXCEEDED');
  assert.equal(reads,0);
});

test('T17 HTML data escaping cannot create executable tag terminators',()=>{
  const io=project();
  const raw=JSON.stringify({script:'</script><script src="https://invalid.example/x.js"></script>',style:'</style><style>@import "https://invalid.example/x.css"</style>',svg:"<svg onload=\"fetch('https://invalid.example/x')\"></svg>",separators:'\u2028\u2029'});
  const escaped=io.escapeJsonForHtml(raw);
  assert.equal(escaped.toLowerCase().includes('</script'),false);
  assert.equal(escaped.toLowerCase().includes('</style'),false);
  assert.equal(escaped.includes('<svg'),false);
  assert.deepEqual(JSON.parse(escaped),JSON.parse(raw));
});
