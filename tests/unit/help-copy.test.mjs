import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const source=readFileSync(new URL('../../src/index.template.html',import.meta.url),'utf8');
test('help explains use and limits without developer verification notes',()=>{
  for(const phrase of ["スマートフォン実機の動作確認はまだ完了していません", "Real-device smartphone verification is not complete yet"]){
    assert.ok(!source.includes(phrase),`Unexpected developer note: ${phrase}`);
  }
});
test('help retains privacy and compatibility cautions',()=>{
  for(const phrase of ["OSのファイルプレビューでは動かない場合があります", "An OS file preview may not execute the app", "個人情報や機密情報を消す機能ではありません", "This tool does not redact personal or confidential information"]){
    assert.ok(source.includes(phrase),`Missing user caution: ${phrase}`);
  }
});
