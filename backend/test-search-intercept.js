#!/usr/bin/env node
/**
 * Usa Playwright con el cookie v2 seteado para navegar a la búsqueda
 * y capturar las llamadas API que retornan venues.
 */
const https = require('https');

const FIREBASE_API_KEY = 'AIzaSyAB0fvp8LL6gRD9FCI3KdT0wQ9gKw13iIw';
const EMAIL = 'appfulbo.test@gmail.com';
const PASSWORD = 'AppFulbo2026!';

async function httpReq(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function getV2Token() {
  const r1 = await httpReq(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true })
  );
  const r2 = await httpReq(
    'https://atcsports.io/api/v2/accounts/login',
    { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' } },
    JSON.stringify({ id_token: r1.data.idToken })
  );
  return { v2Token: r2.data.data.token, idToken: r1.data.idToken };
}

async function main() {
  console.log('Getting v2 token...');
  const { v2Token } = await getV2Token();
  console.log('v2 token OK');

  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
  });

  // Set v2 cookie
  await context.addCookies([{
    name: 'alquila_tu_cancha_auth_token',
    value: v2Token,
    domain: 'atcsports.io',
    path: '/',
  }]);

  const page = await context.newPage();
  const capturedRequests = [];

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('alquilatucancha.com/api') || url.includes('atcsports.io/api')) {
      capturedRequests.push({
        method: req.method(),
        url: url,
        auth: req.headers()['authorization']?.substring(0, 30) || '-',
      });
    }
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/api/v3/') && res.status() === 200) {
      try {
        const body = await res.json();
        // If it looks like a list of venues
        if (Array.isArray(body) && body.length > 0 && body[0].id && body[0].name) {
          console.log('\n=== VENUE LIST FOUND ===');
          console.log('URL:', url);
          console.log('Count:', body.length);
          console.log('First venue:', JSON.stringify(body[0], null, 2).substring(0, 300));
        } else if (body?.places && Array.isArray(body.places)) {
          console.log('\n=== PLACES FOUND ===');
          console.log('URL:', url);
          console.log('Count:', body.places.length);
        }
      } catch { }
    }
  });

  // Navigate to search with sport=2 (fútbol 5), CABA coordinates
  const DATE = '2026-04-12';
  console.log('Navigating to search page...');
  try {
    await page.goto(
      `https://atcsports.io/buscar?sport=2&date=${DATE}&lat=-34.6037&lng=-58.3816&zoom=13`,
      { waitUntil: 'networkidle', timeout: 25000 }
    );
  } catch (e) {
    console.log('Navigation error (may have timed out):', e.message.substring(0, 100));
  }

  await page.waitForTimeout(3000);

  console.log('\n--- Captured API requests ---');
  for (const r of capturedRequests) {
    console.log(`${r.method} ${r.url}`);
    if (r.auth !== '-') console.log(`  Auth: ${r.auth}...`);
  }

  // Also try the home search form
  console.log('\n\nTrying home page search...');
  capturedRequests.length = 0;
  try {
    await page.goto('https://atcsports.io', { waitUntil: 'networkidle', timeout: 20000 });
  } catch {}
  await page.waitForTimeout(2000);

  const url = page.url();
  console.log('Current URL:', url);
  console.log('Captured:', capturedRequests.map(r => r.url).join('\n'));

  await browser.close();
}

main().catch(console.error);
