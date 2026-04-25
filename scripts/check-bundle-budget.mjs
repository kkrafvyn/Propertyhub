import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const BUILD_ASSETS_DIR = path.resolve(process.cwd(), 'build', 'assets');

const MAX_JS_KB = Number(process.env.BUNDLE_MAX_JS_KB || 650);
const MAX_CSS_KB = Number(process.env.BUNDLE_MAX_CSS_KB || 320);
const MAX_TOTAL_JS_KB = Number(process.env.BUNDLE_MAX_TOTAL_JS_KB || 3200);

const toKb = (bytes) => Number((bytes / 1024).toFixed(2));

const formatAsset = (asset) => `${asset.name} (${toKb(asset.bytes)} KB)`;

async function main() {
  const files = await readdir(BUILD_ASSETS_DIR);
  const assets = [];

  for (const name of files) {
    const fullPath = path.join(BUILD_ASSETS_DIR, name);
    const info = await stat(fullPath);
    if (!info.isFile()) continue;

    assets.push({
      name,
      bytes: info.size,
      ext: path.extname(name),
    });
  }

  const jsAssets = assets.filter((asset) => asset.ext === '.js');
  const cssAssets = assets.filter((asset) => asset.ext === '.css');

  const jsViolations = jsAssets.filter((asset) => toKb(asset.bytes) > MAX_JS_KB);
  const cssViolations = cssAssets.filter((asset) => toKb(asset.bytes) > MAX_CSS_KB);
  const totalJsKb = toKb(jsAssets.reduce((sum, asset) => sum + asset.bytes, 0));
  const totalJsViolation = totalJsKb > MAX_TOTAL_JS_KB;

  const largestJs = [...jsAssets]
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 5)
    .map(formatAsset);
  const largestCss = [...cssAssets]
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 5)
    .map(formatAsset);

  console.log('Bundle budget summary');
  console.log(`- JS assets: ${jsAssets.length}`);
  console.log(`- CSS assets: ${cssAssets.length}`);
  console.log(`- Total JS: ${totalJsKb} KB (limit: ${MAX_TOTAL_JS_KB} KB)`);
  console.log('- Largest JS files:');
  largestJs.forEach((line) => console.log(`  - ${line}`));
  console.log('- Largest CSS files:');
  largestCss.forEach((line) => console.log(`  - ${line}`));

  const violations = [];

  if (jsViolations.length) {
    violations.push(
      `JS asset size exceeded (${MAX_JS_KB} KB): ${jsViolations.map(formatAsset).join(', ')}`
    );
  }

  if (cssViolations.length) {
    violations.push(
      `CSS asset size exceeded (${MAX_CSS_KB} KB): ${cssViolations.map(formatAsset).join(', ')}`
    );
  }

  if (totalJsViolation) {
    violations.push(`Total JS size exceeded: ${totalJsKb} KB (limit ${MAX_TOTAL_JS_KB} KB)`);
  }

  if (violations.length) {
    console.error('\nBundle budget violations detected:');
    violations.forEach((violation) => console.error(`- ${violation}`));
    process.exitCode = 1;
    return;
  }

  console.log('\nBundle budget check passed.');
}

main().catch((error) => {
  console.error('Bundle budget check failed:', error);
  process.exitCode = 1;
});
