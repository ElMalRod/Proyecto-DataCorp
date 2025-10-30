import { Product } from '../models/product.js';
import { redis, CACHE_CONFIG } from '../config/database.js';
import type { IProduct } from '../models/product.js';

export interface SearchOptions {
  query: string;
  page?: number;
  limit?: number;
  useCache?: boolean;
}

export interface SearchResult {
  products: IProduct[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  searchTime: number;
  fromCache: boolean;
}

export class SearchService {
  private readonly DEFAULT_LIMIT = 20;
  private readonly MAX_LIMIT = 100;

  async searchProducts(options: SearchOptions): Promise<SearchResult> {
    const startTime = Date.now();
    const { query, page = 1, limit = this.DEFAULT_LIMIT, useCache = true } = options;

    const normalizedQuery = this.normalizeQuery(query);
    const actualLimit = Math.min(limit, this.MAX_LIMIT);
    const skip = (page - 1) * actualLimit;

    // Pipeline de Redis - Ejecutar múltiples comandos en paralelo
    if (useCache) {
      const cached = await this.getFromCacheWithPipeline(normalizedQuery, page, actualLimit);
      if (cached) {
        // Track búsqueda popular en segundo plano (no bloqueante)
        this.trackPopularSearch(normalizedQuery).catch(err =>
          console.error('Error tracking search:', err)
        );

        return {
          ...cached,
          searchTime: Date.now() - startTime,
          fromCache: true
        };
      }
    }

    // Realizar búsqueda con precedencia
    const searchResult = await this.performSearch(normalizedQuery, skip, actualLimit);

    const result: SearchResult = {
      products: searchResult.products,
      totalCount: searchResult.totalCount,
      page,
      limit: actualLimit,
      totalPages: Math.ceil(searchResult.totalCount / actualLimit),
      searchTime: Date.now() - startTime,
      fromCache: false
    };

    // Cache Predictivo - Guardar y trackear en paralelo
    if (useCache && result.products.length > 0) {
      Promise.all([
        this.saveToCacheWithPipeline(normalizedQuery, page, actualLimit, result),
        this.trackPopularSearch(normalizedQuery)
      ]).catch(err => console.error('Error saving cache:', err));
    }

    return result;
  }

  private async performSearch(query: string, skip: number, limit: number): Promise<{ products: IProduct[]; totalCount: number }> {
    if (!query || query.trim() === '') {
      const [products, totalCount] = await Promise.all([
        Product.find({}).skip(skip).limit(limit).lean(),
        Product.countDocuments({})
      ]);
      return { products: products as any[], totalCount };
    }

    // Limitar longitud de query para evitar búsquedas excesivamente lentas
    const trimmedQuery = query.length > 100 ? query.substring(0, 100) : query;

    // Para queries muy largas (>50 caracteres), usar búsqueda optimizada
    if (trimmedQuery.length > 50) {
      return await this.optimizedLongQuerySearch(trimmedQuery, skip, limit);
    }

    // Búsqueda con precedencia jerárquica
    const searchQueries = this.buildPrecedenceQueries(trimmedQuery);

    let allProducts: any[] = [];
    let totalFound = 0;

    for (const searchQuery of searchQueries) {
      if (allProducts.length >= limit + skip) break;

      const remainingLimit = (limit + skip) - allProducts.length;
      const products = await Product.find(searchQuery)
        .limit(remainingLimit)
        .lean();

      // Filtrar duplicados
      const existingIds = new Set(allProducts.map(p => p._id.toString()));
      const newProducts = products.filter(p => !existingIds.has(p._id.toString()));

      allProducts.push(...newProducts);
      totalFound += newProducts.length;
    }

    // Aplicar paginación
    const paginatedProducts = allProducts.slice(skip, skip + limit);

    return {
      products: paginatedProducts as any[],
      totalCount: Math.max(totalFound, allProducts.length)
    };
  }

  private async optimizedLongQuerySearch(query: string, skip: number, limit: number): Promise<{ products: any[], totalCount: number }> {
    const escapedQuery = this.escapeRegex(query);
    const regex = new RegExp(escapedQuery, 'i');

    // Para queries largas, solo buscar coincidencias exactas en título y SKU
    const searchQuery = {
      $or: [
        { title: regex },
        { sku: regex }
      ]
    };

    const [products, totalCount] = await Promise.all([
      Product.find(searchQuery)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(searchQuery)
    ]);

    return { products: products as any[], totalCount };
  }

  private buildPrecedenceQueries(query: string): any[] {
    const escapedQuery = this.escapeRegex(query);
    const regex = new RegExp(escapedQuery, 'i');
    
    return [
      // 1. Coincidencia exacta en título
      { title: { $regex: `^${escapedQuery}$`, $options: 'i' } },
      
      // 2. Título que comienza con la query
      { title: { $regex: `^${escapedQuery}`, $options: 'i' } },
      
      // 3. Título que contiene la query
      { title: regex },
      
      // 4. Categoría exacta
      { category: { $regex: `^${escapedQuery}$`, $options: 'i' } },
      
      // 5. Categoría que contiene la query
      { category: regex },
      
      // 6. Marca exacta
      { brand: { $regex: `^${escapedQuery}$`, $options: 'i' } },
      
      // 7. Marca que contiene la query
      { brand: regex },
      
      // 8. SKU exacto
      { sku: { $regex: `^${escapedQuery}$`, $options: 'i' } },
      
      // 9. SKU que contiene la query
      { sku: regex },
      
      // 10. Tipo de producto exacto
      { product_type: { $regex: `^${escapedQuery}$`, $options: 'i' } },
      
      // 11. Tipo de producto que contiene la query
      { product_type: regex },
      
      // 12. Búsqueda general en múltiples campos
      {
        $or: [
          { title: regex },
          { category: regex },
          { brand: regex },
          { sku: regex },
          { product_type: regex },
          { description: regex }
        ]
      }
    ];
  }

  async getSuggestions(query: string, limit: number = 10): Promise<string[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const normalizedQuery = this.normalizeQuery(query);
    
    // Intentar obtener del cache
    const cacheKey = `${CACHE_CONFIG.PREFIX.SUGGESTIONS}${normalizedQuery}:${limit}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Generar sugerencias
    const suggestions = await this.generateSuggestions(normalizedQuery, limit);
    
    // Guardar en cache
    await redis.setex(cacheKey, CACHE_CONFIG.SUGGESTIONS_TTL, JSON.stringify(suggestions));
    
    return suggestions;
  }

  private async generateSuggestions(query: string, limit: number): Promise<string[]> {
    const regex = new RegExp(`^${this.escapeRegex(query)}`, 'i');
    const suggestions = new Set<string>();

    // Sugerencias de títulos
    const titleMatches = await Product.find(
      { title: regex },
      { title: 1 }
    ).limit(limit * 2).lean();
    
    titleMatches.forEach(p => {
      if (p.title && suggestions.size < limit) {
        suggestions.add(p.title);
      }
    });

    // Sugerencias de categorías
    if (suggestions.size < limit) {
      const categoryMatches = await Product.find(
        { category: regex },
        { category: 1 }
      ).limit(limit).lean();
      
      categoryMatches.forEach(p => {
        if (p.category && suggestions.size < limit) {
          suggestions.add(p.category);
        }
      });
    }

    // Sugerencias de marcas
    if (suggestions.size < limit) {
      const brandMatches = await Product.find(
        { brand: regex },
        { brand: 1 }
      ).limit(limit).lean();
      
      brandMatches.forEach(p => {
        if (p.brand && suggestions.size < limit) {
          suggestions.add(p.brand);
        }
      });
    }

    return Array.from(suggestions).slice(0, limit);
  }

  private async getFromCache(query: string, page: number, limit: number): Promise<SearchResult | null> {
    try {
      const cacheKey = `${CACHE_CONFIG.PREFIX.SEARCH}${query}:${page}:${limit}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo del cache:', error);
      return null;
    }
  }

  private async saveToCache(query: string, page: number, limit: number, result: SearchResult): Promise<void> {
    try {
      const cacheKey = `${CACHE_CONFIG.PREFIX.SEARCH}${query}:${page}:${limit}`;
      const cacheData = {
        products: result.products,
        totalCount: result.totalCount,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      };
      
      await redis.setex(cacheKey, CACHE_CONFIG.SEARCH_TTL, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error guardando en cache:', error);
    }
  }

  private normalizeQuery(query: string): string {
    return query.trim().toLowerCase();
  }

  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Pipeline de Redis
  private async getFromCacheWithPipeline(query: string, page: number, limit: number): Promise<SearchResult | null> {
    try {
      const cacheKey = `${CACHE_CONFIG.PREFIX.SEARCH}${query}:${page}:${limit}`;
      const popularKey = CACHE_CONFIG.PREFIX.POPULAR;

      // Ejecutar múltiples comandos en un solo round-trip
      const pipeline = redis.pipeline();
      pipeline.get(cacheKey);
      pipeline.zscore(popularKey, query); // Obtener score de popularidad

      const results = await pipeline.exec();

      if (results && results[0] && results[0][1]) {
        const cached = JSON.parse(results[0][1] as string);
        return cached;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo del cache con pipeline:', error);
      return null;
    }
  }

  private async saveToCacheWithPipeline(query: string, page: number, limit: number, result: SearchResult): Promise<void> {
    try {
      const cacheKey = `${CACHE_CONFIG.PREFIX.SEARCH}${query}:${page}:${limit}`;
      const cacheData = {
        products: result.products,
        totalCount: result.totalCount,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      };

      // Usar pipeline para guardar datos y metadata en paralelo
      const pipeline = redis.pipeline();
      pipeline.setex(cacheKey, CACHE_CONFIG.SEARCH_TTL, JSON.stringify(cacheData));

      // Si es primera página, guardar también con TTL más largo para warmup
      if (page === 1) {
        const warmupKey = `${CACHE_CONFIG.PREFIX.WARMUP}${query}`;
        pipeline.setex(warmupKey, CACHE_CONFIG.POPULAR_SEARCHES_TTL, JSON.stringify(cacheData));
      }

      await pipeline.exec();
    } catch (error) {
      console.error('Error guardando en cache con pipeline:', error);
    }
  }

  // Cache Predictivo - Tracking de búsquedas populares
  private async trackPopularSearch(query: string): Promise<void> {
    try {
      if (!query || query.trim() === '') return;

      const popularKey = CACHE_CONFIG.PREFIX.POPULAR;

      // Incrementar score de la búsqueda (Sorted Set)
      await redis.zincrby(popularKey, 1, query);

      // Mantener solo las top 1000 búsquedas para evitar crecimiento infinito
      const count = await redis.zcard(popularKey);
      if (count > 1000) {
        // Eliminar las menos populares
        await redis.zremrangebyrank(popularKey, 0, count - 1001);
      }
    } catch (error) {
      console.error('Error tracking popular search:', error);
    }
  }

  // Obtener búsquedas más populares
  async getPopularSearches(limit: number = 10): Promise<{ query: string; count: number }[]> {
    try {
      const popularKey = CACHE_CONFIG.PREFIX.POPULAR;

      // Obtener top búsquedas con sus scores
      const results = await redis.zrevrange(popularKey, 0, limit - 1, 'WITHSCORES');

      const popularSearches: { query: string; count: number }[] = [];
      for (let i = 0; i < results.length; i += 2) {
        if (results[i] && results[i + 1]) {
          popularSearches.push({
            query: results[i] as string,
            count: parseInt(results[i + 1] as string)
          });
        }
      }

      return popularSearches;
    } catch (error) {
      console.error('Error obteniendo búsquedas populares:', error);
      return [];
    }
  }

  // Warmup - Precarga de búsquedas populares
  async warmupPopularSearches(topN: number = 20): Promise<{ warmed: number; errors: number }> {
    try {
      const popularSearches = await this.getPopularSearches(topN);
      let warmed = 0;
      let errors = 0;

      console.log(` Iniciando warmup de ${popularSearches.length} búsquedas populares...`);

      // Precalentar búsquedas en paralelo (pero con límite)
      const batchSize = 5;
      for (let i = 0; i < popularSearches.length; i += batchSize) {
        const batch = popularSearches.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async ({ query }) => {
            try {
              // Verificar si ya está en cache
              const warmupKey = `${CACHE_CONFIG.PREFIX.WARMUP}${query}`;
              const exists = await redis.exists(warmupKey);

              if (!exists) {
                // Realizar búsqueda y cachearla
                await this.searchProducts({
                  query,
                  page: 1,
                  limit: this.DEFAULT_LIMIT,
                  useCache: true
                });
                console.log(` Warmed: "${query}"`);
              }
              warmed++;
            } catch (error) {
              console.error(` Error warming "${query}":`, error);
              errors++;
            }
          })
        );
      }

      console.log(` Warmup completado: ${warmed} exitosos, ${errors} errores`);
      return { warmed, errors };
    } catch (error) {
      console.error('Error en warmup:', error);
      return { warmed: 0, errors: 1 };
    }
  }

  async getSearchStats(): Promise<any> {
    try {
      // Cache de agregaciones
      const statsKey = `${CACHE_CONFIG.PREFIX.AGGREGATIONS}search_stats`;
      const cached = await redis.get(statsKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Ejecutar agregaciones en paralelo
      const [totalProducts, categoriesCount, brandsCount] = await Promise.all([
        Product.countDocuments(),
        Product.distinct('category').then(cats => cats.length),
        Product.distinct('brand').then(brands => brands.length)
      ]);

      const stats = {
        totalProducts,
        totalCategories: categoriesCount,
        totalBrands: brandsCount
      };

      // Cachear resultado
      await redis.setex(statsKey, CACHE_CONFIG.AGGREGATIONS_TTL, JSON.stringify(stats));

      return stats;
    } catch (error) {
      return {
        error: `Error obteniendo estadísticas: ${error}`
      };
    }
  }
}