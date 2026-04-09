import { Router, Request, Response, NextFunction } from 'express';
import { saveAvailability } from '../services/eventService';
import { validate, required, isArray } from '../middleware/validate';

const router = Router();

// POST /availability
router.post(
  '/',
  validate([required('participantId', 'eventId'), isArray('slots')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await saveAvailability(req.body);
      const count = Array.isArray(result) ? result.length : (result as { count?: number }).count ?? 0;
      res.status(201).json({ saved: count });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
