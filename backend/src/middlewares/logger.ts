import type { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log de la solicitud entrante
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  
  // Interceptar el final de la respuesta
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): any {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 400 ? '\x1b[31m' : statusCode >= 300 ? '\x1b[33m' : '\x1b[32m';
    
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ` +
      `${statusColor}${statusCode}\x1b[0m - ${duration}ms`
    );
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

export const errorLogger = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  const timestamp = new Date().toISOString();
  
  console.error(`[${timestamp}] ERROR en ${req.method} ${req.originalUrl}:`);
  console.error(`- Mensaje: ${error.message}`);
  console.error(`- Stack: ${error.stack}`);
  console.error(`- IP: ${req.ip}`);
  console.error(`- User-Agent: ${req.get('User-Agent')}`);
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    timestamp
  });
};