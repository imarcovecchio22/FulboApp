#!/usr/bin/env node
/**
 * Try place search with v3 JWT, and try various ATC URLs to find more venues
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
      headers: { 'User-Agent': 'Mozilla/5.0', ...(options.headers || {}) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, location: res.headers.location, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, location: res.headers.location, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function getTokens() {
  const r1 = await httpReq(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true })
  );
  const r2 = await httpReq(
    'https://atcsports.io/api/v2/accounts/login',
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    JSON.stringify({ id_token: r1.data.idToken })
  );
  const v2Token = r2.data.data.token;

  // Get v3 JWT
  const r3 = await httpReq(
    'https://alquilatucancha.com/api/v3/auth/oauth/token',
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    JSON.stringify({ grant_type: 'api_v2_token', token: v2Token, client_id: 'atc-web' })
  );
  const v3Token = r3.data?.access_token || r3.data?.token;
  return { v2Token, v3Token };
}

async function testSearch(label, url, token) {
  const res = await httpReq(url, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
  });
  console.log(`\n${label}`);
  console.log(`  URL: ${url}`);
  console.log(`  Status: ${res.status}`, res.location ? `-> ${res.location}` : '');
  if (res.status === 200) {
    const keys = typeof res.data === 'object' ? Object.keys(res.data).join(', ') : 'string';
    console.log(`  Keys/type: ${keys}`);
    if (Array.isArray(res.data)) {
      console.log(`  Array length: ${res.data.length}`);
      if (res.data[0]) console.log(`  First item keys: ${Object.keys(res.data[0]).join(', ')}`);
    }
    console.log(`  Preview: ${JSON.stringify(res.data).substring(0, 300)}`);
  } else {
    console.log(`  Response: ${JSON.stringify(res.data).substring(0, 200)}`);
  }
}

async function main() {
  console.log('Getting tokens...');
  const { v2Token, v3Token } = await getTokens();
  console.log('v2:', v2Token?.substring(0, 10) + '...');
  console.log('v3:', v3Token?.substring(0, 20) + '...');

  const DATE = '2026-04-12';
  const LAT = '-34.6037';
  const LNG = '-58.3816';

  // Try place search with different base URLs and tokens
  await testSearch('place/search atcsports v2',
    `https://atcsports.io/api/v3/place/search?lat=${LAT}&lng=${LNG}&sport_id=2&date=${DATE}`,
    v2Token);

  await testSearch('place/search atcsports v3',
    `https://atcsports.io/api/v3/place/search?lat=${LAT}&lng=${LNG}&sport_id=2&date=${DATE}`,
    v3Token);

  await testSearch('place/search alquilatucancha v3',
    `https://alquilatucancha.com/api/v3/place/search?lat=${LAT}&lng=${LNG}&sport_id=2&date=${DATE}`,
    v3Token);

  // Try v2 clubs endpoint variations
  await testSearch('v2 clubs/nearby v2Token',
    `https://alquilatucancha.com/api/v2/clubs/nearby?lat=${LAT}&lng=${LNG}&sport_id=2&date=${DATE}&distance=10`,
    v2Token);

  await testSearch('v3 clubs/search v3Token',
    `https://alquilatucancha.com/api/v3/clubs/search?lat=${LAT}&lng=${LNG}&sport_id=2&date=${DATE}`,
    v3Token);

  await testSearch('v3 sportclubs/search v3',
    `https://alquilatucancha.com/api/v3/sportclubs/search?lat=${LAT}&lng=${LNG}&sport_id=2&date=${DATE}`,
    v3Token);

  await testSearch('v3 availability/search v3',
    `https://alquilatucancha.com/api/v3/availability/search?lat=${LAT}&lng=${LNG}&sport_id=2&date=${DATE}`,
    v3Token);

  // Try known working venue IDs for Distrito Fútbol and El Predio
  await testSearch('availability/sportclubs/732 (Distrito Futbol) v2',
    `https://alquilatucancha.com/api/v3/availability/sportclubs/732?date=${DATE}`,
    v2Token);
}

main().catch(console.error);
