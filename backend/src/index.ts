import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectMongoDB, redis } from './config/database.js';
import { requestLogger, errorLogger } from './middlewares/logger.js';
import { searchRateLimit, loadRateLimit, suggestRateLimit } from './middlewares/rateLimiter.js';

// Importar rutas
import indexRoutes from './routes/indexRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import suggestRoutes from './routes/suggestRoutes.js';

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
app.use('/index', loadRateLimit, indexRoutes);
app.use('/search', searchRateLimit, searchRoutes);
app.use('/suggest', suggestRateLimit, suggestRoutes);

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
  redis.on('ready', () => console.log('Redis listo para usar'));

  app.listen(PORT, () => {
    console.log('Servidor iniciado');
    console.log(`Puerto: ${PORT}`);
    console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`MongoDB: ${process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/products_db?authSource=admin'}`);
    console.log(`Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);
    console.log('Sistema listo para procesar peticiones');
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