const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const FIREBASE_KEY = 'AIzaSyAB0fvp8LL6gRD9FCI3KdT0wQ9gKw13iIw';
  const firebaseResp = await context.request.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_KEY}`,
    { data: { email: 'appfulbo.test@gmail.com', password: 'AppFulbo2026!', returnSecureToken: true } }
  );
  const { idToken, refreshToken } = await firebaseResp.json();
  console.log('Firebase token ok, length:', idToken.length);
  
  // El token en next.js se pasa como query param o header x-token
  // Veamos el _next/data endpoint con el token como query param
  const endpoints = [
    `/api/v3/place/search?lat=-34.6037&lng=-58.3816&sport_id=1&date=2026-04-15&token=${idToken}`,
    `/api/v3/place/search?lat=-34.6037&lng=-58.3816&sport_id=1&date=2026-04-15`,
  ];
  
  for (const ep of endpoints) {
    const r = await context.request.get(`https://atcsports.io${ep}`, {
      headers: {
        'Accept': 'application/json',
        'x-token': idToken,
        'x-firebase-token': idToken,
        'Authorization': `Bearer ${idToken}`,
      },
      maxRedirects: 0
    });
    console.log('Status:', r.status(), ep.substring(0, 60));
  }
  
  // Intentar via page navigation con localStorage
  await page.goto('https://atcsports.io/', { waitUntil: 'commit' });
  await page.evaluate(`
    localStorage.setItem('token', '${idToken}');
    localStorage.setItem('firebase_token', '${idToken}');
    document.cookie = 'token=${idToken}; path=/';
    document.cookie = 'firebase_token=${idToken}; path=/';
  `);
  
  // Leer el _next/data con cookies
  const r = await page.request.get(
    `https://atcsports.io/_next/data/6gb0aSTwbjdsDgT2UX_Si/buscar.json?sport=1&date=2026-04-15&lat=-34.6037&lng=-58.3816`,
    { headers: { 'Cookie': `token=${idToken}` }, maxRedirects: 0 }
  );
  console.log('NextData buscar.json status:', r.status());
  console.log(JSON.stringify(await r.json()).substring(0, 300));
  
  await browser.close();
})();
