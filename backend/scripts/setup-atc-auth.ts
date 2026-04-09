#!/usr/bin/env ts-node
/**
 * Script de setup one-time para autenticación con ATC Sports.
 * Abre el browser, esperás que te logueés, captura el token y lo guarda.
 *
 * Uso: npx ts-node scripts/setup-atc-auth.ts
 */
import 'dotenv/config';
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const SESSION_FILE = path.join(process.cwd(), '.atc-session.json');

async function main() {
  console.log('\n🔐 ATC Sports — Setup de autenticación\n');
  console.log('Se va a abrir el browser. Loguéate con tu cuenta de atcsports.io.');
  console.log('El script detecta automáticamente cuando terminás y guarda el token.\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--window-size=500,750', '--window-position=100,100'],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  let found = false;

  const poll = setInterval(async () => {
    try {
      const result = await page.evaluate(`
        (() => {
          const key = Object.keys(localStorage).find(k => k.startsWith('firebase:authUser'));
          if (!key) return null;
          try {
            const user = JSON.parse(localStorage.getItem(key));
            const mgr = user?.stsTokenManager;
            if (mgr?.accessToken) {
              return {
                idToken: mgr.accessToken,
                refreshToken: mgr.refreshToken,
                expiresAt: mgr.expirationTime - 60000
              };
            }
          } catch(e) {}
          return null;
        })()
      `);

      if (result && typeof result === 'object' && (result as Record<string, unknown>).idToken) {
        found = true;
        clearInterval(poll);

        fs.writeFileSync(SESSION_FILE, JSON.stringify(result, null, 2));
        console.log('\n✅ Login exitoso! Token guardado en .atc-session.json');
        console.log('   El backend va a usar este token automáticamente.');
        console.log('   Se renueva solo — no necesitás hacer esto de nuevo.\n');

        await browser.close();
        process.exit(0);
      }
    } catch {
      // page not ready
    }
  }, 1500);

  // Timeout de 3 minutos
  setTimeout(async () => {
    if (!found) {
      clearInterval(poll);
      await browser.close();
      console.error('\n❌ Timeout (3 min). Volvé a correr el script.\n');
      process.exit(1);
    }
  }, 180_000);

  await page.goto('https://atcsports.io/login', { waitUntil: 'domcontentloaded' });
  console.log('⏳ Esperando que completes el login en el browser...\n');
}

main().catch(console.error);
