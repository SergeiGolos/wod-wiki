import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const src = path.resolve(__dirname, '../package.json');
const dest = path.resolve(__dirname, '../dist/package.json');

const pkg = JSON.parse(fs.readFileSync(src, 'utf-8'));

// Remove fields not needed in the published package
// You can add/remove fields here as needed
['devDependencies', 'scripts', 'private'].forEach((field) => {
  delete pkg[field];
});

fs.writeFileSync(dest, JSON.stringify(pkg, null, 2), 'utf-8');
console.log('Copied and cleaned package.json to dist/');
