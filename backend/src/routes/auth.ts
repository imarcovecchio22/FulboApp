/**
 * Auth management routes (solo para setup/diagnóstico)
 * GET  /auth/atc/status  → muestra si hay sesión válida
 * POST /auth/atc/login   → abre browser para login interactivo
 */
import { Router, Request, Response, NextFunction } from 'express';
import { getIdToken, interactiveLogin } from '../services/atcAuth';
import { flushCache } from '../lib/cache';

const router = Router();

router.get('/atc/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const token = await getIdToken();
    if (token) {
      res.json({ authenticated: true, tokenPreview: token.slice(0, 20) + '...' });
    } else {
      res.json({ authenticated: false, message: 'No hay sesión. POST /auth/atc/login para autenticarse.' });
    }
  } catch (err) {
    next(err);
  }
});

router.post('/atc/login', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ message: 'Browser abierto. Loguéate en la ventana que apareció.' });
    // Trigger async — responde inmediatamente y el browser se abre en paralelo
    interactiveLogin()
      .then(() => {
        flushCache(); // Limpiar cache para que el próximo request use datos reales
        console.log('✅ ATC login exitoso. Cache limpiado.');
      })
      .catch((err) => console.error('❌ ATC login falló:', err.message));
  } catch (err) {
    next(err);
  }
});

export default router;
