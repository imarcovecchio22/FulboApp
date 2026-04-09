const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });

  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('atcsports') && url.includes('/api/')) {
      try {
        const body = await resp.text();
        console.log('URL:', url);
        console.log('STATUS:', resp.status());
        console.log('BODY_PREVIEW:', body.substring(0, 300));
        console.log('---');
      } catch(e) {}
    }
  });

  try {
    // Go directly to buscar, don't wait for networkidle
    await page.goto('https://atcsports.io/buscar?sport=1&date=2026-04-15&lat=-34.6037&lng=-58.3816', 
      { waitUntil: 'commit', timeout: 15000 });
    await page.waitForTimeout(5000);
    console.log('FINAL URL:', page.url());
    
    // Also try the _next/data route directly
    const res = await page.request.get(
      'https://atcsports.io/_next/data/6gb0aSTwbjdsDgT2UX_Si/buscar.json?sport=1&date=2026-04-15&lat=-34.6037&lng=-58.3816'
    );
    console.log('NEXTDATA STATUS:', res.status());
    const body = await res.text();
    console.log('NEXTDATA BODY:', body.substring(0, 500));
  } catch(e) {
    console.log('ERROR:', e.message);
  }
  
  await browser.close();
})();
