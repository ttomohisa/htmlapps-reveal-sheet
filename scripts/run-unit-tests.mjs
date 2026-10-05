import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const files = readdirSync('tests/unit').filter(name => name.endsWith('.test.mjs')).sort().map(name => 'tests/unit/' + name);
if (!files.length) throw new Error('No unit tests found');
const result = spawnSync(process.execPath, ['--test', ...files], {stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status ?? 1);
