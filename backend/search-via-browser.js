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

  const placeData = [];

  page.on('response', async resp => {
    const url = resp.url();
    if (url.includes('alquilatucancha.com/api') || url.includes('atcsports.io/api')) {
      const status = resp.status();
      console.log(`RESP: ${status} ${url.substring(0, 150)}`);
      if (status === 200 && (url.includes('place') || url.includes('club') || url.includes('search'))) {
        try {
          const body = await resp.json();
          console.log('  BODY:', JSON.stringify(body).substring(0, 500));
          placeData.push(body);
        } catch(e) {}
      }
    }
  });

  // Navigate to home page
  await page.goto('https://atcsports.io/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  
  console.log('Page URL:', page.url());
  
  // Find search form elements
  const searchElements = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, select, button'));
    return inputs.slice(0, 20).map(el => ({
      type: el.tagName + (el.type ? ':' + el.type : ''),
      name: el.name,
      placeholder: el.placeholder,
      value: el.value?.substring(0, 30),
      id: el.id,
      textContent: el.textContent?.trim().substring(0, 30)
    }));
  });
  
  console.log('\n=== Search form elements ===');
  for (const el of searchElements) {
    if (el.textContent || el.placeholder || el.name) {
      console.log(JSON.stringify(el));
    }
  }
  
  // Try to click a search/buscar link or button
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a'));
    return anchors.filter(a => a.href && (a.href.includes('buscar') || a.href.includes('results') || a.href.includes('search')))
      .map(a => ({ href: a.href, text: a.textContent?.trim().substring(0, 30) }));
  });
  
  console.log('\n=== Search-related links ===');
  for (const link of links.slice(0, 10)) {
    console.log(JSON.stringify(link));
  }
  
  // Try making a direct API call from the page
  console.log('\n=== Direct place search from page context ===');
  const result = await page.evaluate(async () => {
    const v3Token = localStorage.getItem('v3_alquila_tu_cancha_auth_token');
    const v2Token = document.cookie.match(/alquila_tu_cancha_auth_token=([^;]+)/)?.[1];
    
    if (!v3Token) return { error: 'no v3 token', v2Token: v2Token?.substring(0, 20) };
    
    // Try the place search with v3 JWT
    try {
      const resp = await fetch('https://alquilatucancha.com/api/v3/place/search?lat=-34.6037&lng=-58.3816&sport_id=1&date=2026-04-10', {
        headers: { 'Authorization': 'Bearer ' + v3Token }
      });
      const body = await resp.text();
      return { status: resp.status, url: resp.url, body: body.substring(0, 500) };
    } catch(e) {
      return { error: e.message };
    }
  });
  console.log('Place search result:', JSON.stringify(result));

  await browser.close();
})();
