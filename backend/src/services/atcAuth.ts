/**
 * ATC Sports — Auth Manager
 *
 * Flujo de autenticación (reverse-engineered):
 * 1. Firebase sign-in → idToken (JWT, expira en 1h)
 * 2. POST atcsports.io/api/v2/accounts/login → v2Token (opaque, persistente)
 * 3. El v2Token se usa como Bearer para llamadas a alquilatucancha.com/api/v3/
 *
 * El refreshToken de Firebase permite renovar el idToken sin login manual.
 * El v2Token parece ser de muy larga duración (mismo valor entre sesiones).
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import logger from '../lib/logger';

const FIREBASE_API_KEY = 'AIzaSyAB0fvp8LL6gRD9FCI3KdT0wQ9gKw13iIw';
const SESSION_FILE = path.join(process.cwd(), '.atc-session.json');

interface Session {
  idToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp ms
  v2Token?: string;
}

let sessionCache: Session | null = null;
let v2TokenCache: string | null = null;

// ─── Persist / load session ───────────────────────────────────────────────────

function loadSession(): Session | null {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null;
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8')) as Session;
  } catch {
    return null;
  }
}

function saveSession(session: Session): void {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), 'utf-8');
}

// ─── Firebase token refresh ───────────────────────────────────────────────────

async function refreshIdToken(refreshToken: string): Promise<Session> {
  const res = await axios.post(
    `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
    `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  const { id_token, refresh_token, expires_in } = res.data;
  const session: Session = {
    idToken: id_token,
    refreshToken: refresh_token,
    expiresAt: Date.now() + (parseInt(expires_in, 10) - 60) * 1000,
  };
  saveSession(session);
  sessionCache = session;
  logger.info('ATC Auth: Firebase token refreshed');
  return session;
}

// ─── v2 token exchange ────────────────────────────────────────────────────────

async function exchangeForV2Token(idToken: string): Promise<string> {
  const res = await axios.post(
    'https://atcsports.io/api/v2/accounts/login',
    { id_token: idToken },
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        Referer: 'https://atcsports.io/login',
        Origin: 'https://atcsports.io',
      },
    }
  );
  const v2Token: string = res.data?.data?.token;
  if (!v2Token) throw new Error('ATC v2 login response missing token');
  return v2Token;
}

// ─── Interactive login via Playwright ────────────────────────────────────────

export async function interactiveLogin(): Promise<Session> {
  logger.info('ATC Auth: starting interactive login (browser will open)');

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: false, args: ['--window-size=480,700'] });
  const context = await browser.newContext();
  const page = await context.newPage();

  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(async () => {
      await browser.close();
      reject(new Error('Login timeout (2 minutes). Run again to retry.'));
    }, 120_000);

    const poll = setInterval(async () => {
      try {
        const stored = await page.evaluate(`
          (() => {
            const keys = Object.keys(localStorage);
            const tokenKey = keys.find(k => k.includes('firebase:authUser'));
            if (!tokenKey) return null;
            const user = JSON.parse(localStorage.getItem(tokenKey));
            return user ? { idToken: user.stsTokenManager?.accessToken, refreshToken: user.stsTokenManager?.refreshToken, expiresAt: user.stsTokenManager?.expirationTime } : null;
          })()
        `);

        if (stored && typeof stored === 'object' && (stored as Record<string, unknown>).idToken) {
          const s = stored as { idToken: string; refreshToken: string; expiresAt: number };
          clearInterval(poll);
          clearTimeout(timeout);

          let v2Token: string | undefined;
          try {
            v2Token = await exchangeForV2Token(s.idToken);
            v2TokenCache = v2Token;
            logger.info('ATC Auth: v2 token obtained after login');
          } catch (e) {
            logger.warn('ATC Auth: could not get v2 token during login:', e instanceof Error ? e.message : e);
          }

          const session: Session = {
            idToken: s.idToken,
            refreshToken: s.refreshToken,
            expiresAt: s.expiresAt - 60_000,
            v2Token,
          };
          saveSession(session);
          sessionCache = session;
          logger.info('ATC Auth: login successful, session saved');
          await browser.close();
          resolve(session);
        }
      } catch { /* page not ready */ }
    }, 1000);

    try {
      await page.goto('https://atcsports.io/login', { waitUntil: 'domcontentloaded' });
      logger.info('ATC Auth: browser opened — please log in to atcsports.io');
    } catch (err) {
      clearInterval(poll);
      clearTimeout(timeout);
      await browser.close();
      reject(err);
    }
  });
}

// ─── Public: get a valid Firebase idToken ────────────────────────────────────

export async function getIdToken(): Promise<string | null> {
  if (process.env.ATC_API_KEY) return process.env.ATC_API_KEY;

  if (sessionCache && Date.now() < sessionCache.expiresAt) return sessionCache.idToken;

  const stored = loadSession();
  if (stored) {
    if (Date.now() < stored.expiresAt) {
      sessionCache = stored;
      if (stored.v2Token) v2TokenCache = stored.v2Token;
      return stored.idToken;
    }
    try {
      const refreshed = await refreshIdToken(stored.refreshToken);
      return refreshed.idToken;
    } catch (err) {
      logger.warn('ATC Auth: token refresh failed:', err instanceof Error ? err.message : err);
    }
  }

  try {
    const session = await interactiveLogin();
    return session.idToken;
  } catch (err) {
    logger.warn('ATC Auth: interactive login failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Public: get a valid v2 token (for alquilatucancha.com API calls) ─────────

export async function getV2Token(): Promise<string | null> {
  // 1. Check env variable
  if (process.env.ATC_API_KEY) return process.env.ATC_API_KEY;

  // 2. In-memory cache (v2 token is long-lived)
  if (v2TokenCache) return v2TokenCache;

  // 3. Load from session file
  const stored = loadSession();
  if (stored?.v2Token) {
    v2TokenCache = stored.v2Token;
    return v2TokenCache;
  }

  // 4. Get Firebase idToken and exchange for v2
  const idToken = await getIdToken();
  if (!idToken) return null;

  try {
    const v2Token = await exchangeForV2Token(idToken);
    v2TokenCache = v2Token;

    // Persist v2Token in session file
    const currentSession = sessionCache || loadSession();
    if (currentSession) {
      const updated = { ...currentSession, v2Token };
      saveSession(updated);
    }
    logger.info('ATC Auth: v2 token obtained and cached');
    return v2Token;
  } catch (err) {
    logger.warn('ATC Auth: v2 token exchange failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export const ATC_FIREBASE = {
  apiKey: FIREBASE_API_KEY,
};
