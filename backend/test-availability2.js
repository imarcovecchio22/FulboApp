#!/usr/bin/env node
const https = require('https');

const FIREBASE_API_KEY = 'AIzaSyAB0fvp8LL6gRD9FCI3KdT0wQ9gKw13iIw';
const EMAIL = 'appfulbo.test@gmail.com';
const PASSWORD = 'AppFulbo2026!';
const DATE = '2026-04-12';

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const opts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
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
  const r1 = await request(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true })
  );
  const r2 = await request(
    'https://atcsports.io/api/v2/accounts/login',
    { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' } },
    JSON.stringify({ id_token: r1.data.idToken })
  );
  return r2.data.data.token;
}

async function main() {
  const v2Token = await getV2Token();
  console.log('v2 token OK:', v2Token.substring(0, 10) + '...');

  const res = await request(
    `https://alquilatucancha.com/api/v3/availability/sportclubs/103?date=${DATE}`,
    {
      headers: {
        'Authorization': `Bearer ${v2Token}`,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://atcsports.io',
      },
    }
  );

  const courts = res.data.available_courts;
  console.log(`\navailable_courts: ${courts.length} courts`);
  if (courts.length > 0) {
    console.log('\nFirst court:');
    console.log(JSON.stringify(courts[0], null, 2));
    if (courts[0].slots?.length > 0) {
      console.log('\nFirst 3 slots of first court:');
      console.log(JSON.stringify(courts[0].slots.slice(0, 3), null, 2));
    }
  }

  // Also try to find more venues — test a place search approach
  // Try GET /api/v3/place/search on alquilatucancha.com directly
  console.log('\n--- Testing place search on alquilatucancha.com ---');
  const searchRes = await request(
    `https://alquilatucancha.com/api/v3/place/search?lat=-34.6037&lng=-58.3816&sport_id=2&date=${DATE}`,
    {
      headers: {
        'Authorization': `Bearer ${v2Token}`,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://atcsports.io',
      },
    }
  );
  console.log('place/search status:', searchRes.status);
  if (searchRes.status === 200) {
    const places = Array.isArray(searchRes.data) ? searchRes.data : searchRes.data?.places ?? searchRes.data?.data ?? searchRes.data;
    console.log('Response type:', Array.isArray(searchRes.data) ? 'array' : 'object');
    console.log('Top keys:', Array.isArray(searchRes.data) ? `array[${searchRes.data.length}]` : Object.keys(searchRes.data));
    console.log(JSON.stringify(searchRes.data, null, 2).substring(0, 800));
  } else {
    console.log('Response:', JSON.stringify(searchRes.data).substring(0, 300));
  }

  // Try the v2 clubs/search
  console.log('\n--- Testing v2 clubs search ---');
  const clubsRes = await request(
    `https://alquilatucancha.com/api/v2/clubs/search?lat=-34.6037&lng=-58.3816&sport_id=2&date=${DATE}&distance=10`,
    {
      headers: {
        'Authorization': `Bearer ${v2Token}`,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://atcsports.io/',
      },
    }
  );
  console.log('clubs/search status:', clubsRes.status);
  if (clubsRes.status === 200) {
    console.log('Keys:', Object.keys(clubsRes.data));
    console.log(JSON.stringify(clubsRes.data, null, 2).substring(0, 800));
  } else {
    console.log('Response:', JSON.stringify(clubsRes.data).substring(0, 300));
  }
}

main().catch(console.error);
