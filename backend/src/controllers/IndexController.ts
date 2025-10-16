import type { Request, Response } from 'express';
import { DataLoaderService } from '../services/DataLoaderService.js';
import { clearRateLimit } from '../middlewares/rateLimiter.js';
import path from 'path';

export class IndexController {
  private dataLoaderService: DataLoaderService;

  constructor() {
    this.dataLoaderService = new DataLoaderService();
  }

  async loadData(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Ruta al archivo CSV
      const csvPath = path.join(process.cwd(), 'data', 'productos_2m.csv');
      
      console.log(`Iniciando carga desde: ${csvPath}`);
      
      const result = await this.dataLoaderService.loadProductsFromCSV(csvPath);
      
      const endTime = Date.now();
      const totalDuration = (endTime - startTime) / 1000;
      
      if (result.success) {
        // Limpiar rate limits después de carga exitosa
        await clearRateLimit(req, 'load');
        await clearRateLimit(req, 'stats');
        
        res.status(200).json({
          success: true,
          message: result.message,
          stats: {
            ...result.stats,
            totalDuration: `${totalDuration.toFixed(2)}s`
          },
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message,
          stats: result.stats,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Error en carga de datos:', error);
      res.status(500).json({
        success: false,
        message: `Error interno del servidor: ${error}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  async getLoadStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.dataLoaderService.getLoadStats();
      
      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: `Error obteniendo estadísticas: ${error}`,
        timestamp: new Date().toISOString()
      });
    }
  }
}