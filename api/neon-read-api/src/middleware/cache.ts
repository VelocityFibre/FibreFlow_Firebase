import { Request, Response, NextFunction } from 'express';

export function cacheMiddleware(seconds: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', `public, max-age=${seconds}`);
    next();
  };
}