import type { Request, Response } from 'express';
import { WarmupService } from '../services/WarmupService.js';

export class CacheController {
  private warmupService: WarmupService;

  constructor() {
    this.warmupService = new WarmupService();
  }

  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.warmupService.getCacheMetrics();

      res.status(200).json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error obteniendo métricas de cache:', error);
      res.status(500).json({
        success: false,
        message: `Error obteniendo métricas: ${error}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      await this.warmupService.clearSelectiveCache();

      res.status(200).json({
        success: true,
        message: 'Cache limpiado y precalentado exitosamente',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error limpiando cache:', error);
      res.status(500).json({
        success: false,
        message: `Error limpiando cache: ${error}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  async performWarmup(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.warmupService.performFullWarmup();

      res.status(200).json({
        success: true,
        data: result,
        message: 'Warmup completado exitosamente',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error en warmup:', error);
      res.status(500).json({
        success: false,
        message: `Error en warmup: ${error}`,
        timestamp: new Date().toISOString()
      });
    }
  }
}
