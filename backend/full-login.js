const { chromium } = require('playwright');

(async () => {
  const FIREBASE_API_KEY = 'AIzaSyAB0fvp8LL6gRD9FCI3KdT0wQ9gKw13iIw';
  
  // Get Firebase idToken via REST API first
  const firebaseResp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'appfulbo.test@gmail.com', password: 'AppFulbo2026!', returnSecureToken: true })
    }
  );
  const firebaseData = await firebaseResp.json();
  const idToken = firebaseData.idToken;
  const refreshToken = firebaseData.refreshToken;
  const localId = firebaseData.localId;
  
  console.log('Firebase idToken:', idToken.substring(0, 40) + '...');
  console.log('localId:', localId);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });

  page = await context.newPage();
  
  let sessionCookies = [];
  
  page.on('response', async resp => {
    const url = resp.url();
    const headers = resp.headers();
    if (headers['set-cookie']) {
      console.log('SET-COOKIE from', url.substring(0, 100), ':', headers['set-cookie'].substring(0, 200));
      sessionCookies.push({ url, cookie: headers['set-cookie'] });
    }
  });

  // Go to home page first
  await page.goto('https://atcsports.io/', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  
  // Inject Firebase auth into the page's localStorage/Firebase internal storage
  await page.evaluate(({ idToken, refreshToken, localId }) => {
    // Firebase stores auth state in IndexedDB or localStorage with this key format:
    // firebase:authUser:<apiKey>:[DEFAULT]
    const firebaseKey = `firebase:authUser:AIzaSyAB0fvp8LL6gRD9FCI3KdT0wQ9gKw13iIw:[DEFAULT]`;
    
    // Decode idToken to get expiration
    const parts = idToken.split('.');
    const payload = JSON.parse(atob(parts[1]));
    
    const userData = {
      uid: localId,
      email: 'appfulbo.test@gmail.com',
      emailVerified: false,
      isAnonymous: false,
      providerData: [{
        providerId: 'password',
        uid: 'appfulbo.test@gmail.com',
        displayName: null,
        email: 'appfulbo.test@gmail.com',
        phoneNumber: null,
        photoURL: null
      }],
      stsTokenManager: {
        refreshToken: refreshToken,
        accessToken: idToken,
        expirationTime: payload.exp * 1000
      },
      createdAt: Date.now().toString(),
      lastLoginAt: Date.now().toString(),
      apiKey: 'AIzaSyAB0fvp8LL6gRD9FCI3KdT0wQ9gKw13iIw',
      appName: '[DEFAULT]'
    };
    
    localStorage.setItem(firebaseKey, JSON.stringify(userData));
    
    // Also set ATC v2 token
    localStorage.setItem('alquila_tu_cancha_auth_token', 'bF5qmqfOLgt0i4JKy8eevfgznAvbXDlsgn4w8ker1X750OgfyIcymBlWWsXS');
    
    return 'done';
  }, { idToken, refreshToken, localId });
  
  console.log('Injected Firebase auth into localStorage');
  
  // Wait a bit then check if the app recognized the auth
  await page.waitForTimeout(2000);
  
  // Get cookies
  const cookies = await context.cookies();
  console.log('\n=== All cookies ===');
  for (const c of cookies) {
    console.log(`${c.name}: ${c.value.substring(0, 80)}... (domain: ${c.domain})`);
  }
  
  // Try navigating to buscar now
  await page.goto('https://atcsports.io/buscar?sport=1&date=2026-04-10&lat=-34.6037&lng=-58.3816',
    { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
  console.log('\nURL after buscar navigation:', page.url());
  
  // Get cookies again after navigation
  const cookies2 = await context.cookies();
  console.log('\n=== Cookies after navigation ===');
  for (const c of cookies2) {
    console.log(`${c.name}: ${c.value.substring(0, 80)}... (domain: ${c.domain})`);
  }

  await browser.close();
})();
