/**
 * Create proxied CNAMEs for Pages custom domains.
 *
 * Requires a Cloudflare API token with:
 *   Zone → DNS → Edit  (for zone savecolor.org)
 *
 * Usage:
 *   export CLOUDFLARE_API_TOKEN=...
 *   node scripts/setup-savecolor-dns.js
 */
const ZONE_ID = 'eba910ec1d25fd70bd4a19fdae8ee31b';
const TARGET = 'savecolor.pages.dev';
const RECORDS = [
  { type: 'CNAME', name: 'savecolor.org', content: TARGET, proxied: true, ttl: 1 },
  { type: 'CNAME', name: 'www', content: TARGET, proxied: true, ttl: 1 }
];

async function main() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    console.error('Set CLOUDFLARE_API_TOKEN first.');
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const listRes = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?per_page=100`,
    { headers }
  );
  const list = await listRes.json();
  if (!list.success) {
    console.error('Failed to list DNS:', list.errors);
    process.exit(1);
  }

  for (const want of RECORDS) {
    const existing = (list.result || []).find(
      (r) => r.name === (want.name.includes('.') ? want.name : `${want.name}.savecolor.org`) ||
        r.name === want.name
    );
    // Normalize lookup
    const fullName = want.name === 'www' ? 'www.savecolor.org' : want.name;
    const found = (list.result || []).find((r) => r.name === fullName);

    if (found) {
      if (found.type === 'CNAME' && found.content === TARGET && found.proxied) {
        console.log(`OK (exists): ${fullName} -> ${TARGET}`);
        continue;
      }
      const upd = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${found.id}`,
        { method: 'PUT', headers, body: JSON.stringify({ ...want, name: fullName }) }
      );
      const body = await upd.json();
      console.log(body.success ? `Updated: ${fullName}` : `Update failed ${fullName}: ${JSON.stringify(body.errors)}`);
    } else {
      const cre = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`,
        { method: 'POST', headers, body: JSON.stringify(want) }
      );
      const body = await cre.json();
      console.log(body.success ? `Created: ${fullName}` : `Create failed ${fullName}: ${JSON.stringify(body.errors)}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
