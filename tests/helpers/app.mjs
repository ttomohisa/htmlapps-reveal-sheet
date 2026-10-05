import '../../scripts/prepare-test-fixtures.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export const imagePath = name => resolve('tests/fixtures/images',name);
export async function openApp(page,{variant=process.env.APP_VARIANT||'readable'}={}) {
 const file = variant === 'self-extract' ? 'index.self-extract.html':'index.html';
 const path=resolve(process.env.ARTIFACT_DIR || 'dist',file);
 // Inline is only an explicitly requested local diagnostic, never CI evidence
 // for file:// or HTTPS startup. CI leaves APP_TEST_MODE unset.
 if(process.env.APP_TEST_MODE==='inline')await page.setContent(readFileSync(path,'utf8'));
 else await page.goto(pathToFileURL(path).href);
 await page.locator('#addButton').waitFor({state:'visible'});
}
