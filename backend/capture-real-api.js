const { chromium } = require('playwright');

(async () => {
  const V2_TOKEN = 'bF5qmqfOLgt0i4JKy8eevfgznAvbXDlsgn4w8ker1X750OgfyIcymBlWWsXS';
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  
  // Set the session cookie BEFORE opening the page
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

  // Capture ALL network requests
  page.on('request', req => {
    const url = req.url();
    const method = req.method();
    if ((url.includes('/api/') || url.includes('alquilatucancha') || url.includes('atcsports')) && 
        !url.includes('sentry') && !url.includes('google') && !url.includes('analytics')) {
      const headers = req.headers();
      console.log(`REQ: ${method} ${url.substring(0, 180)}`);
      if (headers['authorization']) console.log(`  AUTH: ${headers['authorization'].substring(0, 100)}`);
      if (headers['x-token-auth']) console.log(`  X-TOKEN: ${headers['x-token-auth'].substring(0, 50)}`);
    }
  });

  page.on('response', async resp => {
    const url = resp.url();
    if ((url.includes('/api/') || url.includes('alquilatucancha')) && 
        !url.includes('sentry') && !url.includes('google')) {
      console.log(`RESP: ${resp.status()} ${url.substring(0, 180)}`);
      if (resp.status() >= 200 && resp.status() < 400 && resp.status() !== 307) {
        try {
          const body = await resp.text();
          if (body && body.length > 10) console.log(`  BODY: ${body.substring(0, 300)}`);
        } catch(e) {}
      }
    }
  });

  try {
    console.log('=== Navigating to home ===');
    await page.goto('https://atcsports.io/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    console.log('\n=== Checking login state ===');
    const isLoggedIn = await page.evaluate(() => {
      const v2Token = document.cookie.match(/alquila_tu_cancha_auth_token=([^;]+)/);
      const v3Token = localStorage.getItem('v3_alquila_tu_cancha_auth_token');
      const fbToken = Object.keys(localStorage).find(k => k.startsWith('firebase:authUser'));
      return { v2Token: v2Token ? v2Token[1].substring(0, 20) : null, v3Token: v3Token ? v3Token.substring(0, 20) : null, fbKey: fbToken };
    });
    console.log('Auth state:', JSON.stringify(isLoggedIn));
    
    // Navigate to results/buscar
    console.log('\n=== Navigating to buscar/results ===');
    await page.goto('https://atcsports.io/results?sport=1&date=2026-04-10&lat=-34.6037&lng=-58.3816', 
      { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('URL:', page.url());
    await page.waitForTimeout(5000);
    
  } catch(e) {
    console.log('Error:', e.message.substring(0, 100));
  }

  await browser.close();
})();
