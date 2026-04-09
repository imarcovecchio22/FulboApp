import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

type ValidatorFn = (body: Record<string, unknown>) => string | null;

export function validate(validators: ValidatorFn[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const v of validators) {
      const err = v(req.body as Record<string, unknown>);
      if (err) return next(new AppError(400, err));
    }
    next();
  };
}

export const required =
  (...fields: string[]): ValidatorFn =>
  (body) => {
    for (const f of fields) {
      if (!body[f]) return `Field '${f}' is required`;
    }
    return null;
  };

export const isISODate =
  (...fields: string[]): ValidatorFn =>
  (body) => {
    for (const f of fields) {
      const val = body[f];
      if (typeof val !== 'string' || isNaN(Date.parse(val))) {
        return `Field '${f}' must be a valid ISO date`;
      }
    }
    return null;
  };

export const isArray =
  (...fields: string[]): ValidatorFn =>
  (body) => {
    for (const f of fields) {
      if (!Array.isArray(body[f])) return `Field '${f}' must be an array`;
    }
    return null;
  };
