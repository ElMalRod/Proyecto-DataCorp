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
    
    // Intentar obtener del cache
    if (useCache) {
      const cached = await this.getFromCache(normalizedQuery, page, actualLimit);
      if (cached) {
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

    // Guardar en cache
    if (useCache && result.products.length > 0) {
      await this.saveToCache(normalizedQuery, page, actualLimit, result);
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

    // Búsqueda con precedencia jerárquica
    const searchQueries = this.buildPrecedenceQueries(query);
    
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

  async getSearchStats(): Promise<any> {
    try {
      const totalProducts = await Product.countDocuments();
      const categoriesCount = await Product.distinct('category').then(cats => cats.length);
      const brandsCount = await Product.distinct('brand').then(brands => brands.length);
      
      return {
        totalProducts,
        totalCategories: categoriesCount,
        totalBrands: brandsCount
      };
    } catch (error) {
      return {
        error: `Error obteniendo estadísticas: ${error}`
      };
    }
  }
}