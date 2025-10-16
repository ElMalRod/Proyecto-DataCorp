import { Product } from '../models/product.js';
import { redis } from '../config/database.js';

export interface CategorySearchOptions {
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CategorySearchResult {
  products: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  categories: string[];
  performance: {
    searchTime: number;
    cacheHit: boolean;
    source: string;
  };
}

export class CategoryService {
  private readonly CACHE_PREFIX = 'category_search:';
  private readonly CATEGORIES_CACHE_KEY = 'all_categories';
  private readonly CACHE_EXPIRY = 300; // 5 minutos

  async searchByCategory(options: CategorySearchOptions): Promise<CategorySearchResult> {
    const startTime = Date.now();
    const {
      category,
      page = 1,
      limit = 10,
      sortBy = 'title',
      sortOrder = 'asc'
    } = options;

    // Crear clave de caché
    const cacheKey = this.generateCacheKey(options);

    try {
      // Intentar obtener desde caché
      const cached = await redis.get(cacheKey);
      if (cached) {
        const result = JSON.parse(cached);
        result.performance = {
          searchTime: Date.now() - startTime,
          cacheHit: true,
          source: 'redis'
        };
        return result;
      }

      // Realizar búsqueda en MongoDB
      const filter: any = {};
      if (category && category !== 'all') {
        filter.category = { $regex: category, $options: 'i' };
      }

      // Configurar ordenamiento
      const sortOptions: any = {};
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Calcular skip para paginación
      const skip = (page - 1) * limit;

      // Ejecutar consultas en paralelo
      const [products, total, categories] = await Promise.all([
        Product.find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(filter),
        this.getAllCategories()
      ]);

      // Calcular información de paginación
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      const result: CategorySearchResult = {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev
        },
        categories,
        performance: {
          searchTime: Date.now() - startTime,
          cacheHit: false,
          source: 'mongodb'
        }
      };

      // Guardar en caché solo si hay resultados
      if (products.length > 0) {
        await redis.setex(cacheKey, this.CACHE_EXPIRY, JSON.stringify({
          products,
          pagination: result.pagination,
          categories
        }));
      }

      return result;

    } catch (error) {
      console.error('Error en búsqueda por categoría:', error);
      throw new Error(`Error en búsqueda por categoría: ${error}`);
    }
  }

  async getAllCategories(): Promise<string[]> {
    try {
      // Intentar obtener desde caché
      const cached = await redis.get(this.CATEGORIES_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }

      // Obtener categorías únicas desde MongoDB
      const categories = await Product.distinct('category');
      const sortedCategories = categories.sort();

      // Guardar en caché por más tiempo (1 hora)
      await redis.setex(this.CATEGORIES_CACHE_KEY, 3600, JSON.stringify(sortedCategories));

      return sortedCategories;

    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      throw new Error(`Error obteniendo categorías: ${error}`);
    }
  }

  async getCategoryStats(): Promise<{ category: string; count: number }[]> {
    const cacheKey = 'category_stats';
    
    try {
      // Intentar obtener desde caché
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Obtener estadísticas por categoría
      const stats = await Product.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            count: 1
          }
        }
      ]);

      // Guardar en caché por 30 minutos
      await redis.setex(cacheKey, 1800, JSON.stringify(stats));

      return stats;

    } catch (error) {
      console.error('Error obteniendo estadísticas de categorías:', error);
      throw new Error(`Error obteniendo estadísticas de categorías: ${error}`);
    }
  }

  private generateCacheKey(options: CategorySearchOptions): string {
    const {
      category = 'all',
      page = 1,
      limit = 10,
      sortBy = 'title',
      sortOrder = 'asc'
    } = options;

    return `${this.CACHE_PREFIX}${category}:${page}:${limit}:${sortBy}:${sortOrder}`;
  }

  async clearCache(): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}*`;
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      
      // También limpiar caché de categorías
      await redis.del(this.CATEGORIES_CACHE_KEY);
      await redis.del('category_stats');
      
    } catch (error) {
      console.error('Error limpiando caché de categorías:', error);
    }
  }
}