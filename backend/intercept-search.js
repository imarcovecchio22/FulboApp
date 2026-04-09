const { chromium } = require('playwright');
const { execSync } = require('child_process');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  // Intercept ALL API requests
  page.on('request', req => {
    const url = req.url();
    if ((url.includes('/api/') || url.includes('alquilatucancha')) && !url.includes('sentry')) {
      const headers = req.headers();
      console.log('REQ:', req.method(), url.substring(0, 200));
      if (headers['authorization']) console.log('  AUTH:', headers['authorization'].substring(0, 80));
      if (headers['x-token-auth']) console.log('  X-TOKEN:', headers['x-token-auth'].substring(0, 80));
    }
  });

  page.on('response', async resp => {
    const url = resp.url();
    if ((url.includes('/api/') || url.includes('alquilatucancha')) && !url.includes('sentry')) {
      console.log('RESP:', resp.status(), url.substring(0, 200));
      if (resp.status() !== 307 && resp.status() < 500) {
        try {
          const body = await resp.text();
          if (body.length > 0) console.log('  BODY:', body.substring(0, 300));
        } catch(e) {}
      }
    }
  });

  // First navigate to home to get any cookies set
  await page.goto('https://atcsports.io/', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  
  // Now inject our auth token into localStorage (v2 token and v3 JWT)
  const V2_TOKEN = 'bF5qmqfOLgt0i4JKy8eevfgznAvbXDlsgn4w8ker1X750OgfyIcymBlWWsXS';
  
  await page.evaluate((token) => {
    // ATC stores v2 token as "alquila_tu_cancha_auth_token"
    localStorage.setItem('alquila_tu_cancha_auth_token', token);
  }, V2_TOKEN);

  // Navigate to the buscar/search page
  console.log('\n=== Navigating to buscar ===');
  try {
    await page.goto('https://atcsports.io/buscar?sport=1&date=2026-04-10&lat=-34.6037&lng=-58.3816', 
      { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    console.log('FINAL URL:', page.url());
  } catch(e) {
    console.log('Error:', e.message.substring(0, 100));
    console.log('FINAL URL:', page.url());
  }
  
  // Also try programmatic API call via page
  console.log('\n=== Direct API call from browser ===');
  const result = await page.evaluate(async () => {
    const token = localStorage.getItem('alquila_tu_cancha_auth_token');
    const v3Token = localStorage.getItem('v3_alquila_tu_cancha_auth_token');
    return { v2Token: token, v3Token };
  });
  console.log('localStorage tokens:', JSON.stringify(result));

  await browser.close();
})();
