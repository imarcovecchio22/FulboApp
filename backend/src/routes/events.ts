import { Router, Request, Response, NextFunction } from 'express';
import {
  listEvents,
  createEvent,
  getEventById,
  deleteEvent,
  joinEvent,
  getEventResults,
} from '../services/eventService';
import { validate, required, isISODate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /events
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const events = await listEvents();
    res.json(events);
  } catch (err) {
    next(err);
  }
});

// POST /events
router.post(
  '/',
  validate([required('name', 'startDate', 'endDate'), isISODate('startDate', 'endDate')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await createEvent(req.body);
      res.status(201).json(event);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /events/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await getEventById(req.params.id);
    if (!event) throw new AppError(404, 'Event not found');
    await deleteEvent(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /events/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await getEventById(req.params.id);
    if (!event) throw new AppError(404, 'Event not found');
    res.json(event);
  } catch (err) {
    next(err);
  }
});

// POST /events/:id/join
router.post(
  '/:id/join',
  validate([required('name')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await getEventById(req.params.id);
      if (!event) throw new AppError(404, 'Event not found');

      const participant = await joinEvent(req.params.id, { name: req.body.name });
      res.status(201).json(participant);
    } catch (err) {
      next(err);
    }
  }
);

// GET /events/:id/results
router.get('/:id/results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await getEventById(req.params.id);
    if (!event) throw new AppError(404, 'Event not found');

    const results = await getEventResults(req.params.id);
    res.json({ eventId: req.params.id, results });
  } catch (err) {
    next(err);
  }
});

export default router;
