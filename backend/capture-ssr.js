const { chromium } = require('playwright');

(async () => {
  const V2_TOKEN = 'bF5qmqfOLgt0i4JKy8eevfgznAvbXDlsgn4w8ker1X750OgfyIcymBlWWsXS';
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  
  // Set cookie before creating page
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

  // Capture page response and NEXT_DATA
  page.on('response', async resp => {
    if (resp.url().includes('atcsports.io/results') && resp.status() === 200) {
      const body = await resp.text().catch(() => '');
      const nextDataMatch = body.match(/__NEXT_DATA__[^>]*>(\{.+?\})<\/script>/s);
      if (nextDataMatch) {
        console.log('=== __NEXT_DATA__ ===');
        const data = JSON.parse(nextDataMatch[1]);
        console.log('keys in pageProps:', Object.keys(data.props?.pageProps || {}));
        if (data.props?.pageProps?.clubs) {
          console.log('clubs count:', data.props.pageProps.clubs.length);
          console.log('first club:', JSON.stringify(data.props.pageProps.clubs[0]));
        }
        if (data.props?.pageProps?.places) {
          console.log('places count:', data.props.pageProps.places.length);
        }
        // Print all top-level props
        console.log('Full pageProps:', JSON.stringify(data.props?.pageProps).substring(0, 2000));
      }
    }
  });

  try {
    // Try the results page with search params
    const url = 'https://atcsports.io/results?sport=1&date=2026-04-10&lat=-34.6037&lng=-58.3816';
    console.log('Navigating to:', url);
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('Status:', resp?.status());
    console.log('URL:', page.url());
    
    // Extract __NEXT_DATA__ from the page
    const nextData = await page.evaluate(() => {
      const el = document.querySelector('#__NEXT_DATA__');
      if (!el) return null;
      try { return JSON.parse(el.textContent); } catch(e) { return null; }
    });
    
    if (nextData) {
      console.log('\n=== pageProps keys ===');
      console.log(Object.keys(nextData.props?.pageProps || {}));
      console.log('\n=== Full pageProps (2000 chars) ===');
      console.log(JSON.stringify(nextData.props?.pageProps).substring(0, 2000));
    }
    
  } catch(e) {
    console.log('Error:', e.message.substring(0, 200));
    // Get page source
    const content = await page.content().catch(() => '');
    const match = content.match(/__NEXT_DATA__[^>]*>(.+?)<\/script>/s);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        console.log('Status code:', data.props?.pageProps?.statusCode);
        console.log('Error:', data.props?.pageProps?.error);
      } catch(e) {}
    }
  }

  await browser.close();
})();
