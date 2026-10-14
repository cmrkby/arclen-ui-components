import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const files=execFileSync('git',['ls-files','--cached'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const rootFiles=new Set(['.gitignore','LICENSE','README.md','package.json','pnpm-lock.yaml','tsconfig.json','vitest.config.ts']);
const allowed=path=>rootFiles.has(path)||path==='.github/workflows/check.yml'||path==='scripts/check-boundary.mjs'||/^components\/(?!pro\/)[^/]+\/.+/.test(path)||path.startsWith('packages/spec/');
const forbiddenPath=/(^|\/)(?:\.agents|\.claude|runs|AGENTS\.md|SKILL\.md|component-pipeline)(?:\/|$)/i;
const forbiddenText=[/\/Users\/[^/\s]+\//, /\.claude(?:\/|\\|\b)/i, /\.agents(?:\/|\\|\b)/i, /\b(?:cam575|cmrkby)\b/i, /component[- ]authoring[- ]pipeline/i, /GitHub owner/i];
const textFile=/\.(?:[cm]?[jt]sx?|css|json|mdx?|txt|svg|ya?ml)$/i;

for(const path of files){
  if(!allowed(path)||forbiddenPath.test(path))throw new Error(`Unexpected public file: ${path}`);
  if(path==='scripts/check-boundary.mjs'||!textFile.test(path))continue;
  const content=readFileSync(path,'utf8');
  if(forbiddenText.some(pattern=>pattern.test(content)))throw new Error(`Review internal reference in: ${path}`);
}

console.log(`Public boundary passed: ${files.length} tracked files.`);
