import type { Request, Response } from 'express';
import { CategoryService } from '../services/CategoryService.js';

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  async searchByCategory(req: Request, res: Response): Promise<void> {
    try {
      const {
        category,
        page = '1',
        limit = '10',
        sortBy = 'title',
        sortOrder = 'asc'
      } = req.query;

      // Validar parámetros
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        res.status(400).json({
          success: false,
          message: 'Parámetros de paginación inválidos. Page >= 1, Limit entre 1-100'
        });
        return;
      }

      if (!['title', 'price', 'createdAt'].includes(sortBy as string)) {
        res.status(400).json({
          success: false,
          message: 'sortBy debe ser: title, price, o createdAt'
        });
        return;
      }

      if (!['asc', 'desc'].includes(sortOrder as string)) {
        res.status(400).json({
          success: false,
          message: 'sortOrder debe ser: asc o desc'
        });
        return;
      }

      const result = await this.categoryService.searchByCategory({
        category: category as string,
        page: pageNum,
        limit: limitNum,
        sortBy: sortBy as 'title' | 'price' | 'createdAt',
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      res.json({
        success: true,
        data: result.products,
        pagination: result.pagination,
        categories: result.categories,
        performance: result.performance,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error en búsqueda por categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await this.categoryService.getAllCategories();

      res.json({
        success: true,
        data: categories,
        count: categories.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  async getCategoryStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.categoryService.getCategoryStats();

      res.json({
        success: true,
        data: stats,
        count: stats.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas de categorías:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }

  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      await this.categoryService.clearCache();

      res.json({
        success: true,
        message: 'Caché de categorías limpiado exitosamente',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error limpiando caché:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
}