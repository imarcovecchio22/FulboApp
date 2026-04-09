#!/usr/bin/env node
/**
 * Setup automático: usa credenciales de prueba para obtener tokens
 * y guardar la sesión en .atc-session.json
 *
 * Uso: node scripts/setup-atc-auth-auto.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const FIREBASE_API_KEY = 'AIzaSyAB0fvp8LL6gRD9FCI3KdT0wQ9gKw13iIw';
const EMAIL = process.env.ATC_EMAIL || 'appfulbo.test@gmail.com';
const PASSWORD = process.env.ATC_PASSWORD || 'AppFulbo2026!';
const SESSION_FILE = path.join(process.cwd(), '.atc-session.json');

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const opts = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
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

async function main() {
  console.log(`Signing in as ${EMAIL}...`);

  // Step 1: Firebase sign-in
  const firebaseRes = await request(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: EMAIL, password: PASSWORD, returnSecureToken: true }
  );

  if (!firebaseRes.data?.idToken) {
    console.error('Firebase sign-in failed:', JSON.stringify(firebaseRes.data));
    process.exit(1);
  }

  const { idToken, refreshToken, expiresIn } = firebaseRes.data;
  console.log('Firebase OK, idToken prefix:', idToken.substring(0, 20) + '...');

  // Step 2: Exchange for v2 token
  const v2Res = await request(
    'https://atcsports.io/api/v2/accounts/login',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        Referer: 'https://atcsports.io/login',
        Origin: 'https://atcsports.io',
      },
    },
    { id_token: idToken }
  );

  const v2Token = v2Res.data?.data?.token;
  if (!v2Token) {
    console.error('v2 login failed:', JSON.stringify(v2Res.data));
    process.exit(1);
  }
  console.log('v2 token OK:', v2Token.substring(0, 10) + '...');

  // Save session
  const session = {
    idToken,
    refreshToken,
    expiresAt: Date.now() + (parseInt(expiresIn, 10) - 60) * 1000,
    v2Token,
  };

  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), 'utf-8');
  console.log(`\nSession saved to ${SESSION_FILE}`);
  console.log('The backend will now use real ATC data automatically.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
