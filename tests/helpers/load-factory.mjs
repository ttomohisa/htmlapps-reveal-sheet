import '../../scripts/prepare-test-fixtures.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
export function loadFactory(path, name, extras = {}) {
  const source = fs.readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
  return vm.runInNewContext(source + '\n' + name, { Uint8Array, DataView, TextEncoder, TextDecoder, ...extras }, { filename: path });
}
export const toPlain = value => JSON.parse(JSON.stringify(value));
export function testContext() { let n = 0; return { newId: kind => kind + '_' + ++n, nextRevision: () => ++n }; }
