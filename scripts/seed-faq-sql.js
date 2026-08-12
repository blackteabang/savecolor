/**
 * Seed FAQ rows into D1 from faq.json
 * Usage:
 *   node scripts/seed-faq-sql.js > /tmp/seed.sql
 *   npx wrangler d1 execute savecolor --remote --file=/tmp/seed.sql
 *   npx wrangler d1 execute savecolor --local --file=/tmp/seed.sql
 */
const fs = require('fs');
const path = require('path');

const faqPath = path.join(__dirname, '..', 'faq.json');
const items = JSON.parse(fs.readFileSync(faqPath, 'utf8'));

function esc(value) {
  return String(value).replace(/'/g, "''");
}

const lines = ['DELETE FROM faq;'];
for (const item of items) {
  lines.push(
    `INSERT INTO faq (id, category, question, answer, sources) VALUES (${Number(item.id) || 'NULL'}, '${esc(item.category || '기초')}', '${esc(item.question)}', '${esc(item.answer)}', '${esc(JSON.stringify(item.sources || []))}');`
  );
}
process.stdout.write(`${lines.join('\n')}\n`);
