import fs from 'fs';
import csv from 'csv-parser';
import { Product } from '../models/product.js';
import type { IProduct } from '../models/product.js';
import { redis, CACHE_CONFIG } from '../config/database.js';

export class DataLoaderService {
  private readonly BATCH_SIZE = 10000;

  async loadProductsFromCSV(filePath: string): Promise<{ success: boolean; message: string; stats: any }> {
    const startTime = Date.now();
    let totalProcessed = 0;
    let totalInserted = 0;
    let errors = 0;
    
    try {
      console.log('Iniciando carga de productos desde CSV...');
      
      // Limpiar base de datos antes de cargar
      await Product.deleteMany({});
      console.log('Base de datos limpiada');
      
      // Leer CSV en lotes
      const products: any[] = [];
      
      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => {
            products.push({
              title: row.title || row.Title || '',
              category: row.category || row.Category || '',
              brand: row.brand || row.Brand || '',
              product_type: row.product_type || row.ProductType || row['product type'] || '',
              sku: row.sku || row.SKU || '',
              price: parseFloat(row.price || row.Price || '0') || 0,
              description: row.description || row.Description || ''
            });
            
            totalProcessed++;
            
            // Procesar en lotes
            if (products.length >= this.BATCH_SIZE) {
              this.processBatch([...products], totalProcessed)
                .then(inserted => {
                  totalInserted += inserted;
                  console.log(`Lote procesado: ${totalProcessed} registros, ${totalInserted} insertados`);
                })
                .catch(err => {
                  errors++;
                  console.error('Error en lote:', err);
                });
              
              products.length = 0; // Limpiar array
            }
          })
          .on('end', async () => {
            try {
              // Procesar último lote
              if (products.length > 0) {
                const inserted = await this.processBatch(products, totalProcessed);
                totalInserted += inserted;
              }
              
              // Crear índices optimizados después de la carga
              await this.createOptimizedIndexes();
              
              // Limpiar cache
              await this.clearCache();
              
              const endTime = Date.now();
              const duration = (endTime - startTime) / 1000;
              
              const stats = {
                totalProcessed,
                totalInserted,
                errors,
                duration: `${duration.toFixed(2)}s`,
                rate: `${Math.round(totalProcessed / duration)} registros/segundo`
              };
              
              console.log('Carga completada:', stats);
              
              resolve({
                success: true,
                message: 'Productos cargados exitosamente',
                stats
              });
              
            } catch (error) {
              reject({
                success: false,
                message: `Error al procesar último lote: ${error}`,
                stats: { totalProcessed, totalInserted, errors }
              });
            }
          })
          .on('error', (error) => {
            reject({
              success: false,
              message: `Error leyendo CSV: ${error}`,
              stats: { totalProcessed, totalInserted, errors }
            });
          });
      });
      
    } catch (error) {
      return {
        success: false,
        message: `Error en carga: ${error}`,
        stats: { totalProcessed, totalInserted, errors }
      };
    }
  }

  private async processBatch(batch: any[], currentTotal: number): Promise<number> {
    try {
      const result = await Product.insertMany(batch, { 
        ordered: false,
        rawResult: true 
      });
      return result.insertedCount || 0;
    } catch (error: any) {
      if (error.name === 'BulkWriteError') {
        // Contar inserciones exitosas en caso de duplicados
        return error.result?.insertedCount || 0;
      }
      console.error('Error en lote:', error);
      return 0;
    }
  }

  private async createOptimizedIndexes(): Promise<void> {
    console.log('Creando índices optimizados...');
    
    try {
      const collection = Product.collection;
      
      // Índices compuestos para búsquedas específicas
      await collection.createIndex({ title: 1, category: 1 });
      await collection.createIndex({ brand: 1, category: 1 });
      await collection.createIndex({ category: 1, product_type: 1 });
      
      // Índice para paginación
      await collection.createIndex({ _id: 1 });
      
      console.log('Índices creados exitosamente');
    } catch (error) {
      console.error('Error creando índices:', error);
    }
  }

  private async clearCache(): Promise<void> {
    try {
      const keys = await redis.keys(`${CACHE_CONFIG.PREFIX.SEARCH}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      
      const suggestionKeys = await redis.keys(`${CACHE_CONFIG.PREFIX.SUGGESTIONS}*`);
      if (suggestionKeys.length > 0) {
        await redis.del(...suggestionKeys);
      }
      
      console.log('Cache limpiado');
    } catch (error) {
      console.error('Error limpiando cache:', error);
    }
  }

  async getLoadStats(): Promise<any> {
    try {
      const totalProducts = await Product.countDocuments();
      const sampleProduct = await Product.findOne().lean();
      
      return {
        totalProducts,
        sampleProduct,
        indexes: await Product.collection.indexes()
      };
    } catch (error) {
      return {
        error: `Error obteniendo estadísticas: ${error}`
      };
    }
  }
}