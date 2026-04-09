const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Interceptar requests para ver cómo el browser autenticado llama la API
  const apiCalls = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/api/v3/')) {
      apiCalls.push({
        url: url,
        method: req.method(),
        auth: req.headers()['authorization'],
        cookie: req.headers()['cookie']?.substring(0, 100)
      });
    }
  });
  
  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('/api/v3/') && resp.status() !== 307) {
      console.log('SUCCESS:', resp.status(), url);
      try { console.log(JSON.stringify(await resp.json()).substring(0, 300)); } catch(e) {}
    }
  });

  // Simular login via Firebase REST, luego inyectar en localStorage
  const FIREBASE_KEY = 'AIzaSyAB0fvp8LL6gRD9FCI3KdT0wQ9gKw13iIw';
  const resp = await context.request.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_KEY}`,
    { data: { email: 'appfulbo.test@gmail.com', password: 'AppFulbo2026!', returnSecureToken: true } }
  );
  const auth = await resp.json();
  console.log('Firebase login:', auth.email, '- token length:', auth.idToken?.length);
  
  // Navegar a ATC e inyectar el token en localStorage antes de que cargue
  await page.goto('https://atcsports.io/login', { waitUntil: 'domcontentloaded' });
  
  // Inyectar token Firebase en localStorage (formato que usa la app)
  await page.evaluate(`
    const userData = {
      uid: "${auth.localId}",
      email: "${auth.email}",
      stsTokenManager: {
        accessToken: "${auth.idToken}",
        refreshToken: "${auth.refreshToken}",
        expirationTime: ${Date.now() + 3600000}
      }
    };
    localStorage.setItem('firebase:authUser:AIzaSyAB0fvp8LL6gRD9FCI3KdT0wQ9gKw13iIw:[DEFAULT]', JSON.stringify(userData));
  `);
  
  // Ahora navegar al buscar
  await page.goto('https://atcsports.io/buscar?sport=1&date=2026-04-15&lat=-34.6037&lng=-58.3816', 
    { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(4000);
  
  console.log('Final URL:', page.url());
  console.log('API calls captured:', apiCalls.length);
  for (const c of apiCalls) {
    console.log(' -', c.method, c.url.substring(0, 100));
    if (c.auth) console.log('   auth:', c.auth.substring(0, 60));
  }
  
  await browser.close();
})();
