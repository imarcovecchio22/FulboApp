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

  const apiCalls = [];
  
  page.on('request', req => {
    const url = req.url();
    if (url.includes('alquilatucancha.com/api') || url.includes('atcsports.io/api')) {
      const headers = req.headers();
      const entry = { method: req.method(), url, auth: headers['authorization']?.substring(0, 80) };
      apiCalls.push(entry);
    }
  });

  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('alquilatucancha.com/api') || url.includes('atcsports.io/api')) {
      const entry = apiCalls.find(a => a.url === url && !a.status);
      if (entry) {
        entry.status = resp.status();
        try {
          const body = await resp.text();
          if (body.length < 2000) entry.body = body;
          else entry.body = '(large: ' + body.length + ')';
        } catch(e) {}
      }
    }
  });

  try {
    await page.goto('https://atcsports.io/buscar?sport=1&date=2026-04-10&lat=-34.6037&lng=-58.3816', 
      { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    console.log('Page loaded. URL:', page.url());
    
    // Wait for JavaScript to initialize
    await page.waitForTimeout(3000);
    
    // Check what's on the page
    const pageContent = await page.textContent('body');
    console.log('\n=== Page content snippet ===');
    console.log(pageContent?.substring(0, 500));
    
    // Look for search button or form
    const buttons = await page.$$('button');
    console.log('\n=== Buttons ===');
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && text.trim()) console.log('-', text.trim().substring(0, 50));
    }
    
    // Try clicking a search button
    const searchBtn = await page.$('button:has-text("Buscar"), button:has-text("Buscar"), button[type="submit"]');
    if (searchBtn) {
      console.log('\nFound search button, clicking...');
      await searchBtn.click();
      await page.waitForTimeout(5000);
    }
    
    // Try calling the API directly from the page context
    console.log('\n=== Attempting direct API call from page ===');
    const result = await page.evaluate(async () => {
      // Try to call place/search directly
      const token = document.cookie.match(/alquila_tu_cancha_auth_token=([^;]+)/)?.[1];
      const v3Token = localStorage.getItem('v3_alquila_tu_cancha_auth_token');
      
      // Try the place search endpoint  
      const resp = await fetch('https://alquilatucancha.com/api/v3/place/search?lat=-34.6037&lng=-58.3816&sport_id=1&date=2026-04-10', {
        headers: v3Token ? { 'Authorization': 'Bearer ' + v3Token } : {}
      });
      
      return { status: resp.status, tokenLen: v3Token?.length || 0, cookieToken: token?.substring(0, 20) };
    });
    console.log('Direct API call result:', JSON.stringify(result));
    
    await page.waitForTimeout(3000);
    
  } catch(e) {
    console.log('Error:', e.message.substring(0, 200));
  }
  
  console.log('\n=== All API calls ===');
  for (const call of apiCalls) {
    console.log(`${call.status} ${call.method} ${call.url.substring(0, 120)}`);
    if (call.body && !call.body.includes('access_token')) console.log('  Body:', call.body.substring(0, 200));
  }

  await browser.close();
})();
