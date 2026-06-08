import { copyFileSync, existsSync } from 'fs';

const indexPath = 'dist/index.html';
const fallbackPath = 'dist/404.html';

if (!existsSync(indexPath)) {
  console.error('Build output missing: dist/index.html');
  process.exit(1);
}

copyFileSync(indexPath, fallbackPath);
console.log('SPA fallback created: dist/404.html');
