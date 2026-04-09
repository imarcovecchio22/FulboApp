const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });

  page.on('request', req => {
    const url = req.url();
    if (url.includes('atcsports') && url.includes('/api/')) {
      console.log('REQ:', req.method(), url);
      const auth = req.headers()['authorization'];
      if (auth) console.log('  AUTH:', auth.substring(0, 50));
    }
  });

  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('atcsports') && url.includes('/api/') && resp.status() === 200) {
      try {
        const body = await resp.text();
        if (body.startsWith('{') || body.startsWith('[')) {
          console.log('RESP:', resp.status(), url.split('?')[0]);
          console.log('  BODY:', body.substring(0, 200));
        }
      } catch(e) {}
    }
  });

  // Visit the public club page - it loads WITHOUT login
  await page.goto('https://atcsports.io/club/1', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(5000);
  
  console.log('PAGE URL:', page.url());
  await browser.close();
})();
