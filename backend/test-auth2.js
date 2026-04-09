const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const FIREBASE_KEY = 'AIzaSyAB0fvp8LL6gRD9FCI3KdT0wQ9gKw13iIw';
  
  // Hacer login via la API de Next.js directamente
  // Primero obtener Firebase token
  const firebaseResp = await context.request.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_KEY}`,
    { data: { email: 'appfulbo.test@gmail.com', password: 'AppFulbo2026!', returnSecureToken: true } }
  );
  const { idToken, refreshToken } = await firebaseResp.json();
  
  // Buscar el endpoint de login de Next.js
  const loginResp = await context.request.post('https://atcsports.io/api/auth/login', {
    data: { idToken },
    headers: { 'Content-Type': 'application/json' }
  });
  console.log('Next.js login status:', loginResp.status());
  const loginBody = await loginResp.text();
  console.log('Login body:', loginBody.substring(0, 200));
  
  // Ver cookies después del login
  const cookies = await context.cookies('https://atcsports.io');
  console.log('Cookies after login:');
  for (const c of cookies) {
    console.log(` ${c.name}: ${c.value.substring(0, 50)}...`);
  }
  
  // Intentar llamar la API con las cookies de sesión
  const searchResp = await context.request.get(
    'https://atcsports.io/api/v3/place/search?lat=-34.6037&lng=-58.3816&sport_id=1&date=2026-04-15',
    { headers: { 'Accept': 'application/json' }, maxRedirects: 0 }
  );
  console.log('Search status:', searchResp.status());
  const body = await searchResp.text();
  console.log('Search body:', body.substring(0, 500));
  
  await browser.close();
})();
