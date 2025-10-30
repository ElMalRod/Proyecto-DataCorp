import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectMongoDB, redis } from './config/database.js';
import { requestLogger, errorLogger } from './middlewares/logger.js';
import { searchRateLimit, loadRateLimit, suggestRateLimit, statsRateLimit } from './middlewares/rateLimiter.js';
import { WarmupService } from './services/WarmupService.js';

// Importar rutas
import indexRoutes from './routes/indexRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import suggestRoutes from './routes/suggestRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import cacheRoutes from './routes/cacheRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger);

// Rutas principales
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de Indexación y Búsqueda de Productos - DataCorp Solutions',
    version: '1.0.0',
    status: 'OK',
    endpoints: {
      load: 'POST /index/load - Cargar productos desde CSV',
      search: 'GET /search?q=query&page=1&limit=20 - Buscar productos',
      suggest: 'GET /suggest?q=query&limit=10 - Obtener sugerencias',
      stats: 'GET /index/stats - Estadísticas de carga',
      searchStats: 'GET /search/stats - Estadísticas de búsqueda',
      categories: 'GET /categories - Obtener todas las categorías',
      categorySearch: 'GET /categories/search?category=&page=1&limit=10 - Buscar por categoría',
      categoryStats: 'GET /categories/stats - Estadísticas de categorías',
      health: 'GET /health - Estado del sistema'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/health', async (req, res) => {
  try {
    // Verificar MongoDB y Redis
    const mongoStatus = mongoose.connection.readyState === 1;
    const redisStatus = redis.status === 'ready';
    
    // Verificar si hay productos cargados
    const { Product } = await import('./models/product.js');
    const productCount = await Product.countDocuments();
    
    const healthStatus = {
      status: mongoStatus && redisStatus ? 'healthy' : 'unhealthy',
      services: {
        mongodb: {
          status: mongoStatus ? 'connected' : 'disconnected',
          readyState: mongoose.connection.readyState
        },
        redis: {
          status: redisStatus ? 'connected' : 'disconnected',
          info: redis.status
        },
        products: {
          totalCount: productCount,
          loaded: productCount > 0
        }
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: `Health check failed: ${error}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Rutas de la API con rate limiting
app.use('/index', indexRoutes); // Quitamos loadRateLimit ya que cada ruta tiene su propio rate limit
app.use('/search', searchRateLimit, searchRoutes);
app.use('/suggest', suggestRateLimit, suggestRoutes);
app.use('/categories', searchRateLimit, categoryRoutes); // Usamos el mismo rate limit que search
app.use('/cache', statsRateLimit, cacheRoutes); // Cache metrics con rate limit de stats

// Manejo de rutas no encontradas - debe ir después de todas las rutas definidas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'POST /index/load',
      'GET /search',
      'GET /suggest',
      'GET /index/stats',
      'GET /search/stats',
      'GET /categories',
      'GET /categories/search',
      'GET /categories/stats',
      'DELETE /categories/cache',
      'GET /health'
    ],
    timestamp: new Date().toISOString()
  });
});

// Middleware de manejo de errores
app.use(errorLogger);

// Iniciar servidor
const startServer = async () => {
  await connectMongoDB();

  redis.on('connect', () => console.log('Redis conectado'));
  redis.on('error', (err) => console.error('Redis error:', err));
  redis.on('ready', () => {
    console.log('Redis listo para usar');

    // Iniciar warmup periódico después de que Redis esté listo
    const warmupService = new WarmupService();

    // Warmup cada 30 minutos (ajustable según tus necesidades)
    const warmupInterval = parseInt(process.env.WARMUP_INTERVAL_MINUTES || '30');
    warmupService.startPeriodicWarmup(warmupInterval);
  });

  app.listen(PORT, () => {
    console.log('=====================================');
    console.log('Servidor DataCorp iniciado');
    console.log('=====================================');
    console.log(`Puerto: ${PORT}`);
    console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`MongoDB: ${process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/products_db?authSource=admin'}`);
    console.log(`Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);
    console.log('=====================================');
    console.log('Sistema listo para procesar peticiones');
    console.log('Warmup automático activado');
    console.log('=====================================');
  });
};

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

startServer();