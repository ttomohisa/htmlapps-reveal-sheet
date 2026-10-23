const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/index.template.html'),'utf8');
test('informational footer hides at the existing smartphone breakpoint',()=>{assert.ok(source.includes('@media (max-width:767px) { body > footer { display: none; } }'));assert.equal((source.match(/<footer>/g)||[]).length,1);});
