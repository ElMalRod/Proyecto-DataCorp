import type { Request, Response, NextFunction } from 'express';
import { redis } from '../config/database.js';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

export const createRateLimit = (options: RateLimitOptions) => {
  const { windowMs, maxRequests, keyGenerator = (req) => req.ip || 'unknown' } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `ratelimit:${keyGenerator(req)}`;
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }
      
      if (current > maxRequests) {
        res.status(429).json({
          success: false,
          message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
          retryAfter: Math.ceil(windowMs / 1000),
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Agregar headers de rate limit
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - current).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString()
      });
      
      next();
    } catch (error) {
      console.error('Error en rate limiting:', error);
      next();
    }
  };
};

// Rate limits específicos
export const searchRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 100 // 100 búsquedas por minuto
});

export const loadRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  maxRequests: 5 // 5 cargas por hora
});

export const suggestRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 200 // 200 sugerencias por minuto
});