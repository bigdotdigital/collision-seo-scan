#!/usr/bin/env node

const baseUrl = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const website = process.env.SMOKE_WEBSITE_URL || 'https://example.com';
const city = process.env.SMOKE_CITY || 'Denver';
const shop = process.env.SMOKE_SHOP || 'Smoke Test Collision';
const email = process.env.SMOKE_EMAIL || 'smoke@example.com';
const phone = process.env.SMOKE_PHONE || '';

const fail = (message, details) => {
  console.error(`❌ ${message}`);
  if (details) console.error(details);
  process.exit(1);
};

const log = (message) => console.log(`• ${message}`);

const main = async () => {
  log(`Running scan smoke test against ${baseUrl}`);

  const scanRes = await fetch(`${baseUrl}/api/scan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      website_url: website,
      city_or_zip: city,
      shop_name: shop,
      email,
      phone,
      consented: true
    })
  });

  const scanText = await scanRes.text();
  let scanJson;
  try {
    scanJson = JSON.parse(scanText);
  } catch {
    fail('Expected JSON response from /api/scan', scanText);
  }

  if (!scanRes.ok) {
    fail(`/api/scan returned ${scanRes.status}`, scanJson);
  }

  if (!scanJson.ok || !scanJson.scanId || typeof scanJson.score !== 'number') {
    fail('Unexpected /api/scan payload shape', scanJson);
  }

  log(`Scan created: ${scanJson.scanId} (score ${scanJson.score})`);

  const reportRes = await fetch(`${baseUrl}/report/${scanJson.scanId}`);
  const reportHtml = await reportRes.text();

  if (!reportRes.ok) {
    fail(`/report/${scanJson.scanId} returned ${reportRes.status}`);
  }

  if (!reportHtml.includes('Collision SEO Scan Report')) {
    fail('Report page did not include expected heading text');
  }

  log('Report page rendered successfully');
  log(`Email sent flag: ${String(scanJson.emailSent)}`);
  console.log('✅ Smoke test passed');
};

main().catch((err) => fail('Unhandled smoke test error', err));
