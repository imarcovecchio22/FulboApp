#!/usr/bin/env node
/**
 * Usa Playwright para navegar al search de zona norte e interceptar
 * las llamadas API que retornan venues con sus IDs.
 */
const https = require('https');
const fs = require('fs');

const FIREBASE_API_KEY = 'AIzaSyAB0fvp8LL6gRD9FCI3KdT0wQ9gKw13iIw';
const EMAIL = 'appfulbo.test@gmail.com';
const PASSWORD = 'AppFulbo2026!';

function req(url, opts = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname, path: u.pathname + u.search,
      method: opts.method || 'GET', headers: opts.headers || {},
    };
    const r = https.request(options, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, data: d }); } });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function getTokens() {
  const session = JSON.parse(fs.readFileSync('.atc-session.json', 'utf-8'));
  return { v2Token: session.v2Token, idToken: session.idToken };
}

// Zona norte search coordinates
const ZONES = [
  { name: 'Belgrano/Núñez',    lat: -34.5537, lng: -58.4582 },
  { name: 'Saavedra/Coghlan',  lat: -34.5387, lng: -58.4769 },
  { name: 'Villa Urquiza',     lat: -34.5787, lng: -58.4893 },
  { name: 'Vicente López',     lat: -34.5269, lng: -58.4769 },
];

async function main() {
  const { chromium } = require('playwright');

  const { v2Token } = await getTokens();
  console.log('v2 token:', v2Token.substring(0, 10) + '...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Authorization': `Bearer ${v2Token}`,
    },
  });

  // Set auth cookie/localStorage
  await context.addInitScript((token) => {
    window.__v2token = token;
  }, v2Token);

  const allVenues = new Map(); // id -> venue info
  const page = await context.newPage();

  // Intercept all API responses
  page.on('response', async (response) => {
    const url = response.url();
    if (response.status() !== 200) return;

    try {
      if (url.includes('/api/v3/') || url.includes('alquilatucancha.com/api')) {
        const json = await response.json().catch(() => null);
        if (!json) return;

        // Find sportclubs/places arrays
        const items = Array.isArray(json) ? json
          : json.sportclubs || json.places || json.clubs || json.data || [];

        if (Array.isArray(items) && items.length > 0 && items[0]?.id) {
          console.log(`\nAPI: ${url.replace(/https?:\/\/[^/]+/, '')}`);
          console.log(`  → ${items.length} items`);
          for (const v of items) {
            if (v.id && (v.name || v.club_name)) {
              const sport_ids = v.sport_ids || v.sports?.map(s => s.id) || [];
              if (sport_ids.includes('2') || sport_ids.includes(2)) {
                allVenues.set(String(v.id), {
                  id: String(v.id),
                  name: v.name || v.club_name,
                  address: v.location?.name || v.address || v.full_address,
                  sport_ids,
                });
              }
            }
          }
        }
      }
    } catch { /* ignore */ }
  });

  for (const zone of ZONES) {
    const url = `https://atcsports.io/buscar?sport=2&lat=${zone.lat}&lng=${zone.lng}&zoom=14&date=2026-04-11`;
    console.log(`\nSearching: ${zone.name} → ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20_000 });
      await page.waitForTimeout(1500);

      // Also try to extract from __NEXT_DATA__
      const nextData = await page.evaluate(() => {
        const el = document.getElementById('__NEXT_DATA__');
        return el ? JSON.parse(el.textContent) : null;
      }).catch(() => null);

      if (nextData) {
        const props = nextData?.props?.pageProps;
        const items = props?.sportclubs || props?.places || props?.clubs || props?.results || [];
        if (Array.isArray(items) && items.length > 0) {
          console.log(`  NEXT_DATA: ${items.length} items`);
          for (const v of items) {
            const sport_ids = v.sport_ids || [];
            if (sport_ids.includes('2') || sport_ids.includes(2)) {
              allVenues.set(String(v.id), {
                id: String(v.id), name: v.name,
                address: v.location?.name || v.address,
                sport_ids,
              });
            }
          }
        }
      }
    } catch (e) {
      console.log('  Error:', e.message);
    }
  }

  await browser.close();

  console.log('\n\n=== VENUES ZONA NORTE CON FÚTBOL 5 ===');
  if (allVenues.size === 0) {
    console.log('No se encontraron venues. Probando search directo con API...');
  } else {
    for (const v of allVenues.values()) {
      console.log(`  { id: '${v.id}', name: '${v.name}', address: '${v.address}' }`);
    }
  }
}

main().catch(console.error);
