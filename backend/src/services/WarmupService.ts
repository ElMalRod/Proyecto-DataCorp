import { SearchService } from './SearchService.js';
import { CategoryService } from './CategoryService.js';
import { redis, CACHE_CONFIG } from '../config/database.js';

/**
 * Servicio de Warmup - Precarga de búsquedas populares
 *
 * Este servicio se encarga de:
 * 1. Precalentar las búsquedas más populares
 * 2. Mantener el cache caliente con datos frecuentemente accedidos
 * 3. Ejecutarse periódicamente en segundo plano
 */
export class WarmupService {
  private searchService: SearchService;
  private categoryService: CategoryService;
  private isWarming: boolean = false;

  constructor() {
    this.searchService = new SearchService();
    this.categoryService = new CategoryService();
  }

  /**
   * Ejecuta el warmup completo del sistema
   */
  async performFullWarmup(): Promise<{
    totalWarmed: number;
    searches: number;
    categories: number;
    stats: number;
    errors: number;
    duration: number;
  }> {
    if (this.isWarming) {
      console.log('Warmup ya está en progreso, saltando...');
      return {
        totalWarmed: 0,
        searches: 0,
        categories: 0,
        stats: 0,
        errors: 0,
        duration: 0
      };
    }

    this.isWarming = true;
    const startTime = Date.now();

    console.log('========================================');
    console.log('Iniciando Warmup Completo del Sistema');
    console.log('========================================');

    try {
      const results = await Promise.allSettled([
        this.warmupPopularSearches(),
        this.warmupCategories(),
        this.warmupStats()
      ]);

      const searchResult = results[0].status === 'fulfilled' ? results[0].value : { warmed: 0, errors: 1 };
      const categoryResult = results[1].status === 'fulfilled' ? results[1].value : { warmed: 0, errors: 1 };
      const statsResult = results[2].status === 'fulfilled' ? results[2].value : { warmed: 0, errors: 1 };

      const duration = Date.now() - startTime;
      const totalWarmed = searchResult.warmed + categoryResult.warmed + statsResult.warmed;
      const totalErrors = searchResult.errors + categoryResult.errors + statsResult.errors;

      console.log('========================================');
      console.log(`Warmup completado en ${duration}ms`);
      console.log(`   - Búsquedas: ${searchResult.warmed}`);
      console.log(`   - Categorías: ${categoryResult.warmed}`);
      console.log(`   - Stats: ${statsResult.warmed}`);
      console.log(`   - Total: ${totalWarmed} elementos cacheados`);
      if (totalErrors > 0) {
        console.log(`   - Errores: ${totalErrors}`);
      }
      console.log('========================================');

      this.isWarming = false;

      return {
        totalWarmed,
        searches: searchResult.warmed,
        categories: categoryResult.warmed,
        stats: statsResult.warmed,
        errors: totalErrors,
        duration
      };
    } catch (error) {
      console.error('Error en warmup completo:', error);
      this.isWarming = false;
      throw error;
    }
  }

  /**
   * Precalienta las búsquedas más populares
   */
  private async warmupPopularSearches(topN: number = 20): Promise<{ warmed: number; errors: number }> {
    try {
      console.log(`\nPrecalentando top ${topN} búsquedas populares...`);
      const result = await this.searchService.warmupPopularSearches(topN);
      return result;
    } catch (error) {
      console.error('Error en warmup de búsquedas:', error);
      return { warmed: 0, errors: 1 };
    }
  }

  /**
   * Precalienta todas las categorías
   */
  private async warmupCategories(): Promise<{ warmed: number; errors: number }> {
    try {
      console.log('\nPrecalentando categorías...');

      // Obtener todas las categorías (esto las cachea automáticamente)
      const categories = await this.categoryService.getAllCategories();
      console.log(`   ${categories.length} categorías cacheadas`);

      // Obtener stats de categorías (operación pesada, cachearla es importante)
      await this.categoryService.getCategoryStats();
      console.log(`   Estadísticas de categorías cacheadas`);

      // Precalentar búsquedas de las categorías más populares
      const topCategories = categories.slice(0, 5);
      let warmed = 0;

      for (const category of topCategories) {
        try {
          await this.categoryService.searchByCategory({
            category,
            page: 1,
            limit: 12
          });
          console.log(`   Categoría "${category}" cacheada`);
          warmed++;
        } catch (error) {
          console.error(`   Error cacheando categoría "${category}"`);
        }
      }

      return { warmed: categories.length + warmed + 1, errors: 0 };
    } catch (error) {
      console.error('Error en warmup de categorías:', error);
      return { warmed: 0, errors: 1 };
    }
  }

  /**
   * Precalienta las estadísticas del sistema
   */
  private async warmupStats(): Promise<{ warmed: number; errors: number }> {
    try {
      console.log('\nPrecalentando estadísticas del sistema...');

      // Cachear stats de búsqueda
      await this.searchService.getSearchStats();
      console.log('   Stats de búsqueda cacheadas');

      // Cachear búsquedas populares
      const popularSearches = await this.searchService.getPopularSearches(10);
      console.log(`   Top ${popularSearches.length} búsquedas populares obtenidas`);

      return { warmed: 2, errors: 0 };
    } catch (error) {
      console.error('Error en warmup de stats:', error);
      return { warmed: 0, errors: 1 };
    }
  }

  /**
   * Inicia el warmup periódico (ejecutar en background)
   */
  startPeriodicWarmup(intervalMinutes: number = 30): NodeJS.Timeout {
    console.log(`Warmup periódico configurado cada ${intervalMinutes} minutos`);

    // Ejecutar warmup inmediatamente al iniciar
    this.performFullWarmup().catch(err =>
      console.error('Error en warmup inicial:', err)
    );

    // Configurar ejecución periódica
    return setInterval(() => {
      console.log(`\nEjecutando warmup periódico (cada ${intervalMinutes} min)...`);
      this.performFullWarmup().catch(err =>
        console.error('Error en warmup periódico:', err)
      );
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Limpia el cache selectivamente (útil después de cargar datos nuevos)
   */
  async clearSelectiveCache(): Promise<void> {
    try {
      console.log('Limpiando cache selectivamente...');

      const pipeline = redis.pipeline();

      // Limpiar solo caches de búsqueda y categorías, mantener el tracking de popularidad
      const patterns = [
        `${CACHE_CONFIG.PREFIX.SEARCH}*`,
        `${CACHE_CONFIG.PREFIX.AGGREGATIONS}*`,
        'category_search:*',
        'category_stats',
        'all_categories'
      ];

      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          pipeline.del(...keys);
        }
      }

      await pipeline.exec();
      console.log('Cache limpiado, manteniendo búsquedas populares');

      // Ejecutar warmup después de limpiar
      await this.performFullWarmup();
    } catch (error) {
      console.error('Error limpiando cache:', error);
    }
  }

  /**
   * Obtiene métricas del sistema de cache
   */
  async getCacheMetrics(): Promise<{
    totalKeys: number;
    searchKeys: number;
    categoryKeys: number;
    popularSearchesCount: number;
    memoryUsage: string;
  }> {
    try {
      const [
        searchKeys,
        categoryKeys,
        popularCount,
        info
      ] = await Promise.all([
        redis.keys(`${CACHE_CONFIG.PREFIX.SEARCH}*`),
        redis.keys('category_search:*'),
        redis.zcard(CACHE_CONFIG.PREFIX.POPULAR),
        redis.info('memory')
      ]);

      // Extraer uso de memoria
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage: string = memoryMatch && memoryMatch[1] ? memoryMatch[1].trim() : 'N/A';

      return {
        totalKeys: searchKeys.length + categoryKeys.length,
        searchKeys: searchKeys.length,
        categoryKeys: categoryKeys.length,
        popularSearchesCount: popularCount,
        memoryUsage
      };
    } catch (error) {
      console.error('Error obteniendo métricas:', error);
      return {
        totalKeys: 0,
        searchKeys: 0,
        categoryKeys: 0,
        popularSearchesCount: 0,
        memoryUsage: 'N/A'
      };
    }
  }
}
