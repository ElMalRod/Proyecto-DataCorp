import * as Redis from 'ioredis';
import mongoose from 'mongoose';

// Configuración Redis
export const redis = new Redis.Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

// Configuración MongoDB
export const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/products_db?authSource=admin');
    console.log('MongoDB conectado exitosamente');
  } catch (error) {
    console.error('Error conectando MongoDB:', error);
    process.exit(1);
  }
};

// Configuración del cache
export const CACHE_CONFIG = {
  SEARCH_TTL: 300, // 5 minutos
  SUGGESTIONS_TTL: 600, // 10 minutos
  STATS_TTL: 3600, // 1 hora
  POPULAR_SEARCHES_TTL: 86400, // 24 horas
  AGGREGATIONS_TTL: 1800, // 30 minutos
  PREFIX: {
    SEARCH: 'search:',
    SUGGESTIONS: 'suggestions:',
    STATS: 'stats:',
    POPULAR: 'popular_searches',
    AGGREGATIONS: 'agg:',
    WARMUP: 'warmup:'
  }
};