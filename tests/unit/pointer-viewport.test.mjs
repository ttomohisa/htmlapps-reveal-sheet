import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFactory,toPlain} from '../helpers/load-factory.mjs';

const core=loadFactory('src/reveal/core.js','createRevealCore')();

test('T15 isTap uses the 6 CSS px threshold and cancelled gestures never activate',()=>{
  assert.equal(typeof core.isTap,'function');
  assert.equal(core.isTap({distanceCssPx:0,cancelled:false}),true);
  assert.equal(core.isTap({distanceCssPx:6,cancelled:false}),true);
  assert.equal(core.isTap({distanceCssPx:6.001,cancelled:false}),false);
  assert.equal(core.isTap({distanceCssPx:7,cancelled:false}),false);
  assert.equal(core.isTap({distanceCssPx:0,cancelled:true}),false);
  assert.equal(core.isTap({distanceCssPx:NaN,cancelled:false}),false);
});

test('T15 resizeView preserves normalized center and relative zoom across rotation/resize',()=>{
  assert.equal(typeof core.resizeView,'function');
  const before={zoom:2.5,centerX:.72,centerY:.31};
  const portrait={width:390,height:620};
  const landscape={width:720,height:340};
  const after=core.resizeView(before,portrait,landscape);
  assert.deepEqual(toPlain(after),before);
  const roundTrip=core.resizeView(after,landscape,portrait);
  assert.deepEqual(toPlain(roundTrip),before);
});

test('T15 resizeView rejects invalid boxes and normalizes out-of-range state without moving valid state',()=>{
  assert.throws(()=>core.resizeView({zoom:1,centerX:.5,centerY:.5},{width:0,height:100},{width:100,height:100}),{code:'INVALID_STUDY_ACTION'});
  const value=core.resizeView({zoom:99,centerX:-1,centerY:2},{width:320,height:500},{width:500,height:320});
  assert.equal(value.zoom,16);
  assert.equal(value.centerX,1/32);
  assert.equal(value.centerY,31/32);
});
