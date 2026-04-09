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

  // Only capture non-static API calls
  page.on('request', req => {
    const url = req.url();
    if ((url.includes('/api/') || url.includes('alquilatucancha')) && 
        !url.includes('sentry') && !url.includes('google') && !url.includes('growthbook') &&
        !url.includes('_next') && !url.includes('facebook')) {
      const headers = req.headers();
      console.log(`REQ: ${req.method()} ${url}`);
      if (headers['authorization']) console.log(`  AUTH: ${headers['authorization'].substring(0, 80)}`);
    }
  });

  page.on('response', async resp => {
    const url = resp.url();
    if ((url.includes('/api/') || url.includes('alquilatucancha')) && 
        !url.includes('sentry') && !url.includes('google') && !url.includes('growthbook') &&
        !url.includes('_next') && !url.includes('facebook')) {
      console.log(`RESP: ${resp.status()} ${url}`);
      if (resp.status() >= 200 && resp.status() < 400) {
        try {
          const body = await resp.text();
          if (body && body.length > 10 && body.length < 2000) console.log(`  BODY: ${body.substring(0, 500)}`);
          else if (body.length >= 2000) console.log(`  BODY: (${body.length} chars) ${body.substring(0, 200)}`);
        } catch(e) {}
      }
    }
  });

  try {
    // Navigate to buscar - this is the main search page
    console.log('=== Navigating to buscar ===');
    await page.goto('https://atcsports.io/buscar?sport=1&date=2026-04-10&lat=-34.6037&lng=-58.3816', 
      { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('URL after load:', page.url());
    
    // Wait longer for JavaScript to load and make API calls
    await page.waitForTimeout(8000);
    console.log('Final URL:', page.url());
    
  } catch(e) {
    console.log('Error:', e.message.substring(0, 100));
    console.log('Current URL:', page.url());
  }

  await browser.close();
})();
