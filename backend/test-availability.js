#!/usr/bin/env node
/**
 * Test script: verifica la disponibilidad de canchas via API real de ATC Sports
 *
 * Flujo:
 * 1. Firebase sign-in con credenciales de prueba → idToken
 * 2. POST /api/v2/accounts/login → v2 token
 * 3. GET alquilatucancha.com/api/v3/availability/sportclubs/{id}?date= → slots
 */

const https = require('https');

const FIREBASE_API_KEY = 'AIzaSyAB0fvp8LL6gRD9FCI3KdT0wQ9gKw13iIw';
const EMAIL = 'appfulbo.test@gmail.com';
const PASSWORD = 'AppFulbo2026!';
const DATE = '2026-04-12'; // próximo sábado

const VENUES = [
  { id: '103', name: 'El Anden', permalink: 'el-anden-caba' },
];

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
        try { resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, data }); }
      });
    });

    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // Step 1: Firebase sign-in
  console.log('1. Firebase sign-in...');
  const firebaseRes = await request(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true })
  );

  if (firebaseRes.status !== 200) {
    console.error('Firebase error:', firebaseRes.status, firebaseRes.data);
    process.exit(1);
  }

  const { idToken, refreshToken } = firebaseRes.data;
  console.log('   Firebase OK, idToken prefix:', idToken.substring(0, 20) + '...');

  // Step 2: ATC v2 login
  console.log('2. ATC v2 login...');
  const v2Res = await request(
    'https://atcsports.io/api/v2/accounts/login',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://atcsports.io/login',
        'Origin': 'https://atcsports.io',
      },
    },
    JSON.stringify({ id_token: idToken })
  );

  console.log('   v2 login status:', v2Res.status);

  let v2Token;
  if (v2Res.status === 200) {
    // Token might be in various places
    v2Token = v2Res.data?.token || v2Res.data?.auth_token || v2Res.data?.access_token || v2Res.data?.api_token;
    console.log('   v2 response keys:', Object.keys(v2Res.data || {}));
    console.log('   v2 token:', v2Token ? v2Token.substring(0, 20) + '...' : 'NOT FOUND');
    console.log('   Full v2 response:', JSON.stringify(v2Res.data, null, 2));
  } else {
    console.error('   v2 login failed:', JSON.stringify(v2Res.data));
    // Try using Firebase idToken directly as Bearer
    v2Token = idToken;
    console.log('   Fallback: using Firebase idToken as Bearer');
  }

  // Step 3: Test availability endpoint
  for (const venue of VENUES) {
    console.log(`\n3. Fetching availability for ${venue.name} (ID ${venue.id})...`);

    const availRes = await request(
      `https://alquilatucancha.com/api/v3/availability/sportclubs/${venue.id}?date=${DATE}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${v2Token}`,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://atcsports.io/',
          'Origin': 'https://atcsports.io',
        },
      }
    );

    console.log('   Status:', availRes.status);
    if (availRes.status === 200) {
      console.log('   SUCCESS! Response structure:');
      const data = availRes.data;
      if (Array.isArray(data)) {
        console.log(`   Array with ${data.length} items`);
        if (data.length > 0) {
          console.log('   First item keys:', Object.keys(data[0]));
          console.log('   First item sample:', JSON.stringify(data[0], null, 2).substring(0, 500));
        }
      } else {
        console.log('   Top-level keys:', Object.keys(data));
        console.log('   Full response (first 1000 chars):', JSON.stringify(data, null, 2).substring(0, 1000));
      }
    } else {
      console.log('   FAILED. Response:', JSON.stringify(availRes.data).substring(0, 500));
    }
  }

  // Also try with sport filter
  console.log('\n4. Trying with sport_id=2 filter...');
  const availWithSport = await request(
    `https://alquilatucancha.com/api/v3/availability/sportclubs/103?date=${DATE}&sport_id=2`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${v2Token}`,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://atcsports.io/',
        'Origin': 'https://atcsports.io',
      },
    }
  );
  console.log('   Status:', availWithSport.status);
  if (availWithSport.status === 200) {
    console.log('   Keys:', Object.keys(availWithSport.data));
  }

  console.log('\nDone. Firebase refreshToken (save this):', refreshToken.substring(0, 30) + '...');
}

main().catch(console.error);
