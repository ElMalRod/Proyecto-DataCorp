import type { Request, Response } from 'express';
import { SearchService } from '../services/SearchService.js';

export class SearchController {
  private searchService: SearchService;

  constructor() {
    this.searchService = new SearchService();
  }

  async search(req: Request, res: Response): Promise<void> {
    try {
      const { 
        q: query = '', 
        page = '1', 
        limit = '20',
        cache = 'true'
      } = req.query;

      const searchOptions = {
        query: query as string,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        useCache: (cache as string).toLowerCase() !== 'false'
      };

      // Validaciones
      if (searchOptions.page < 1) searchOptions.page = 1;
      if (searchOptions.limit < 1) searchOptions.limit = 1;
      if (searchOptions.limit > 100) searchOptions.limit = 100;

      const result = await this.searchService.searchProducts(searchOptions);

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          query: searchOptions.query,
          pagination: {
            currentPage: result.page,
            totalPages: result.totalPages,
            totalItems: result.totalCount,
            itemsPerPage: result.limit,
            hasNextPage: result.page < result.totalPages,
            hasPrevPage: result.page > 1
          },
          performance: {
            searchTime: `${result.searchTime}ms`,
            fromCache: result.fromCache
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error en búsqueda:', error);
      res.status(500).json({
        success: false,
        message: `Error en búsqueda: ${error}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  async suggest(req: Request, res: Response): Promise<void> {
    try {
      const { q: query = '', limit = '10' } = req.query;

      if (!query || (query as string).length < 2) {
        res.status(400).json({
          success: false,
          message: 'Query debe tener al menos 2 caracteres',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const suggestionLimit = Math.min(parseInt(limit as string) || 10, 20);
      const suggestions = await this.searchService.getSuggestions(query as string, suggestionLimit);

      res.status(200).json({
        success: true,
        data: {
          query: query as string,
          suggestions,
          count: suggestions.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error en sugerencias:', error);
      res.status(500).json({
        success: false,
        message: `Error en sugerencias: ${error}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  async getSearchStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.searchService.getSearchStats();

      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error obteniendo estadísticas de búsqueda:', error);
      res.status(500).json({
        success: false,
        message: `Error obteniendo estadísticas: ${error}`,
        timestamp: new Date().toISOString()
      });
    }
  }
}