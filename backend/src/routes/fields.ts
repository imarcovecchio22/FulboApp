import { Router, Request, Response, NextFunction } from 'express';
import { getFieldAvailability } from '../services/atcService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /fields?date=YYYY-MM-DD&time=HH:mm
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { date, time } = req.query as { date?: string; time?: string };

    if (!date || !time) {
      throw new AppError(400, 'Query params `date` (YYYY-MM-DD) and `time` (HH:mm) are required');
    }

    // Validate formats
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError(400, '`date` must be in YYYY-MM-DD format');
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      throw new AppError(400, '`time` must be in HH:mm format');
    }

    const availability = await getFieldAvailability(date, time);
    res.json(availability);
  } catch (err) {
    next(err);
  }
});

export default router;
