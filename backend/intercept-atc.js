const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  let sessionCookie = null;
  let foundToken = null;

  // Intercept ALL requests
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/api/') || url.includes('securetoken') || url.includes('identitytoolkit')) {
      const headers = req.headers();
      console.log('REQ:', req.method(), url.substring(0, 160));
      if (headers['authorization']) console.log('  AUTH:', headers['authorization'].substring(0, 80));
    }
  });

  page.on('response', async resp => {
    const url = resp.url();
    try {
      const respHeaders = resp.headers();
      if (url.includes('/api/') || url.includes('securetoken') || url.includes('identitytoolkit')) {
        console.log('RESP:', resp.status(), url.substring(0, 160));
        const setCookie = respHeaders['set-cookie'];
        if (setCookie) {
          console.log('  SET-COOKIE:', setCookie.substring(0, 200));
          if (setCookie.includes('session') || setCookie.includes('__session') || setCookie.includes('token')) {
            sessionCookie = setCookie;
          }
        }
        if (resp.status() !== 307 && resp.status() < 400) {
          const body = await resp.text();
          if (body.length < 500) console.log('  BODY:', body);
        }
      }
    } catch(e) {}
  });

  try {
    // Navigate to login page
    console.log('\n=== Navigating to login ===');
    await page.goto('https://atcsports.io/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    
    console.log('URL after goto:', page.url());
    
    // Try to find email/password fields
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passInput = await page.$('input[type="password"], input[name="password"]');
    
    if (emailInput && passInput) {
      console.log('Found login form, filling...');
      await emailInput.fill('appfulbo.test@gmail.com');
      await passInput.fill('AppFulbo2026!');
      
      // Find submit button
      const submitBtn = await page.$('button[type="submit"], button:has-text("Ingresar"), button:has-text("Login")');
      if (submitBtn) {
        await submitBtn.click();
        console.log('Clicked submit');
        await page.waitForTimeout(5000);
        console.log('URL after login:', page.url());
      }
    } else {
      console.log('No login form found. Page content:');
      const text = await page.textContent('body');
      console.log(text?.substring(0, 500));
    }
    
    // Get all cookies after login
    const cookies = await context.cookies();
    console.log('\n=== COOKIES after login ===');
    for (const c of cookies) {
      console.log(`${c.name}: ${c.value.substring(0, 80)}... (domain: ${c.domain})`);
    }
    
  } catch(e) {
    console.log('ERROR:', e.message);
  }
  
  await browser.close();
})();
