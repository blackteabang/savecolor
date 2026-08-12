const fs = require('fs');
const path = require('path');

const root = __dirname.replace(/[\\/]scripts$/, '') || path.join(__dirname, '..');
const out = path.join(root, 'public');

const files = [
  'index.html',
  'admin.html',
  'config.js',
  'faq.json',
  'privacy.html',
  'terms.html',
  'logo-web.png',
  'logo.png',
  '.nojekyll',
  'README.md'
];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(path.join(out, 'data'), { recursive: true });

for (const file of files) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(out, file));
  }
}

const dataDir = path.join(root, 'data');
if (fs.existsSync(dataDir)) {
  for (const name of fs.readdirSync(dataDir)) {
    if (name.endsWith('.json')) {
      fs.copyFileSync(path.join(dataDir, name), path.join(out, 'data', name));
    }
  }
}

console.log('Built static assets into public/');
