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

  page.on('request', req => {
    const url = req.url();
    if (url.includes('alquilatucancha.com/api') || 
        (url.includes('atcsports.io/api') && !url.includes('_next'))) {
      const headers = req.headers();
      console.log(`REQ: ${req.method()} ${url.substring(0, 160)}`);
      if (headers['authorization']) console.log(`  AUTH: ${headers['authorization'].substring(0, 60)}`);
    }
  });

  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('alquilatucancha.com/api') || 
        (url.includes('atcsports.io/api') && !url.includes('_next'))) {
      console.log(`RESP: ${resp.status()} ${url.substring(0, 160)}`);
      if (resp.status() === 200 && url.includes('slot')) {
        try {
          const body = await resp.json();
          console.log('  Slots:', JSON.stringify(body).substring(0, 500));
        } catch(e) {}
      }
    }
  });

  try {
    await page.goto('https://atcsports.io/venues/el-anden-caba?sport=2&date=2026-04-10&hour=20', 
      { waitUntil: 'networkidle', timeout: 20000 });
    console.log('Page loaded:', page.url());
    await page.waitForTimeout(3000);
  } catch(e) {
    console.log('Error (timeout acceptable):', e.message.substring(0, 80));
  }

  await browser.close();
})();
