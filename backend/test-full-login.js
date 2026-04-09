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
  const fb = await firebaseResp.json();
  
  // Cargar la página de login
  await page.goto('https://atcsports.io/login', { waitUntil: 'networkidle', timeout: 20000 });
  
  // Inyectar token Firebase tal como lo haría el SDK de Firebase
  await page.evaluate(`
    const key = 'firebase:authUser:AIzaSyAB0fvp8LL6gRD9FCI3KdT0wQ9gKw13iIw:[DEFAULT]';
    const user = {
      uid: '${fb.localId}',
      email: '${fb.email}',
      emailVerified: false,
      isAnonymous: false,
      stsTokenManager: {
        refreshToken: '${fb.refreshToken}',
        accessToken: '${fb.idToken}',
        expirationTime: ${Date.now() + 3600000}
      },
      createdAt: '${Date.now()}',
      lastLoginAt: '${Date.now()}',
      apiKey: 'AIzaSyAB0fvp8LL6gRD9FCI3KdT0wQ9gKw13iIw',
      appName: '[DEFAULT]'
    };
    localStorage.setItem(key, JSON.stringify(user));
    console.log('Token injected');
  `);
  
  // Capturar requests API exitosos
  const successCalls = [];
  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('/api/v3/') && resp.status() === 200) {
      try {
        const body = await resp.text();
        successCalls.push({ url, body: body.substring(0, 300) });
      } catch(e) {}
    }
  });
  
  // Recargar para que Firebase SDK detecte el token en localStorage
  await page.reload({ waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
  
  console.log('URL after reload:', page.url());
  console.log('Successful API calls:', successCalls.length);
  for (const c of successCalls) {
    console.log('  URL:', c.url.substring(0, 80));
    console.log('  Body:', c.body.substring(0, 100));
  }
  
  // Obtener cookies de la sesión
  const cookies = await context.cookies('https://atcsports.io');
  console.log('Cookies:', cookies.map(c => `${c.name}=${c.value.substring(0,30)}`));
  
  // Si estamos logueados, ir a buscar
  if (!page.url().includes('/login')) {
    await page.goto('https://atcsports.io/buscar?sport=1&date=2026-04-15&lat=-34.6037&lng=-58.3816',
      { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(3000);
    console.log('Search page URL:', page.url());
    console.log('API calls after search:', successCalls.length);
  }
  
  await browser.close();
})();
