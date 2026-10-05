import { defineConfig } from '@playwright/test';
const variant=process.env.APP_VARIANT||'readable';
export default defineConfig({
  testDir:'./tests/e2e', timeout:30000, fullyParallel:true, workers:2,
  outputDir:`test-results/${variant}/runs`,
  reporter:[['list'],['json',{outputFile:`test-results/${variant}/results.json`}]],
  use:{locale:'en-US',trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:{...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH}:{} )}},
  projects:[{name:'chromium',use:{browserName:'chromium'}}]
});
