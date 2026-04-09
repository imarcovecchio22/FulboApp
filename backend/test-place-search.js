const { chromium } = require('playwright');

(async () => {
  const V2_TOKEN = 'bF5qmqfOLgt0i4JKy8eevfgznAvbXDlsgn4w8ker1X750OgfyIcymBlWWsXS';
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  
  await context.addCookies([{
    name: 'alquila_tu_cancha_auth_token',
    value: V2_TOKEN,
    domain: '.atcsports.io',
    path: '/',
    httpOnly: false,
    secure: true,
    sameSite: 'None'
  }]);

  const page = await context.newPage();

  // Load the page first to initialize app
  await page.goto('https://atcsports.io/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  
  // Wait for v3 token to be obtained
  const v3Token = await page.evaluate(() => localStorage.getItem('v3_alquila_tu_cancha_auth_token'));
  console.log('V3 token:', v3Token ? v3Token.substring(0, 60) + '...' : 'NOT FOUND');
  
  if (!v3Token) {
    // Try to get it from the app's token manager
    const result = await page.evaluate(async () => {
      // Wait a bit more for the token exchange to happen
      await new Promise(r => setTimeout(r, 2000));
      return localStorage.getItem('v3_alquila_tu_cancha_auth_token');
    });
    console.log('After wait:', result ? result.substring(0, 40) + '...' : 'still null');
  }
  
  // Now make the actual place search call from the browser context
  console.log('\n=== Testing place search endpoints ===');
  
  const tests = [
    { url: 'https://alquilatucancha.com/api/v3/place/search?lat=-34.6037&lng=-58.3816&sport_id=1&date=2026-04-10', useV3: true },
    { url: 'https://alquilatucancha.com/api/v2/clubs/search?lat=-34.6037&lng=-58.3816&sport_id=1&date=2026-04-10', useV2: true },
    { url: 'https://atcsports.io/api/v2/clubs/search?lat=-34.6037&lng=-58.3816&sport_id=1&date=2026-04-10', useV2: true },
  ];
  
  for (const test of tests) {
    const result = await page.evaluate(async ({ url, useV3, useV2 }) => {
      const v3Token = localStorage.getItem('v3_alquila_tu_cancha_auth_token');
      const v2Token = document.cookie.match(/alquila_tu_cancha_auth_token=([^;]+)/)?.[1];
      
      const headers = {};
      if (useV3 && v3Token) headers['Authorization'] = 'Bearer ' + v3Token;
      if (useV2 && v2Token) headers['Authorization'] = 'Bearer ' + v2Token;
      
      try {
        const resp = await fetch(url, { headers });
        const body = await resp.text();
        return { status: resp.status, bodyPreview: body.substring(0, 300) };
      } catch(e) {
        return { error: e.message };
      }
    }, test);
    
    console.log(`${result.status || 'ERR'} ${test.url.substring(0, 80)}`);
    if (result.bodyPreview) console.log('  Body:', result.bodyPreview);
    if (result.error) console.log('  Error:', result.error);
  }

  await browser.close();
})();
