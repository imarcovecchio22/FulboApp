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
    if (url.includes('alquilatucancha.com/api') || 
        (url.includes('atcsports.io') && url.includes('/api'))) {
      apiCalls.push({ method: req.method(), url, auth: req.headers()['authorization']?.substring(0, 80) });
    }
  });

  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('alquilatucancha.com/api') || 
        (url.includes('atcsports.io') && url.includes('/api'))) {
      const call = apiCalls.find(a => a.url === url && !a.status);
      if (call) {
        call.status = resp.status();
        if (resp.status() === 200) {
          try { const b = await resp.text(); call.body = b.substring(0, 300); } catch(e) {}
        }
      }
    }
  });

  await page.goto('https://atcsports.io/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);
  
  // Check cookies and localStorage
  const tokens = await page.evaluate(() => {
    const cookies = document.cookie;
    const ls = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      ls[k] = localStorage.getItem(k)?.substring(0, 40);
    }
    return { cookies: cookies.substring(0, 200), localStorage: ls };
  });
  console.log('Tokens:', JSON.stringify(tokens, null, 2));
  
  // Try to fill in city and click search
  const cityInput = await page.$('input[placeholder="Buscar Ciudad"]');
  if (cityInput) {
    await cityInput.fill('Buenos Aires');
    await page.waitForTimeout(500);
    
    // Look for autocomplete suggestions
    await page.waitForTimeout(2000);
    const suggestions = await page.$$('[class*="suggestion"], [class*="autocomplete"], [class*="dropdown"] li');
    console.log('\nSuggestions count:', suggestions.length);
    
    for (const sug of suggestions.slice(0, 5)) {
      const text = await sug.textContent();
      console.log('-', text?.trim().substring(0, 50));
    }
    
    // Click the first suggestion or the search button
    if (suggestions.length > 0) {
      await suggestions[0].click();
    } else {
      const searchBtn = await page.$('button[id="tag-manager-home-desktop-courts-searcher"]');
      if (searchBtn) {
        await searchBtn.click();
        console.log('Clicked search button');
      }
    }
    
    await page.waitForTimeout(5000);
    console.log('\nURL after search:', page.url());
  }
  
  console.log('\n=== API calls made ===');
  for (const c of apiCalls) {
    if (c.url.includes('oauth') || c.url.includes('booking') || c.url.includes('activ')) continue;
    console.log(`${c.status || '?'} ${c.method} ${c.url.substring(0, 120)}`);
    if (c.body) console.log('  Body:', c.body.substring(0, 200));
  }
  
  await browser.close();
})();
