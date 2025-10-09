import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import * as Redis from 'ioredis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Conexión MongoDB
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/products_db?authSource=admin');
    console.log('MongoDB conectado');
  } catch (error) {
    console.error('Error conectando MongoDB:', error);
  }
};

// Conexión Redis
const redis = new Redis.Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

redis.on('connect', () => console.log(' Redis conectado'));
redis.on('error', (err) => console.error(' Redis error:', err));

// Rutas básicas para probar
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de Indexación de Productos',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: redis.status === 'ready' ? 'connected' : 'disconnected'
  });
});

// Ruta de prueba para MongoDB
app.get('/test/mongo', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const statusMap: { [key: number]: string } = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    let databases = null;
    if (mongoose.connection.db) {
      databases = await mongoose.connection.db.admin().listDatabases();
    }
    res.json({ 
      mongodb: statusMap[dbStatus],
      databases
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al conectar con MongoDB' });
  }
});

// Ruta de prueba para Redis
app.get('/test/redis', async (req, res) => {
  try {
    await redis.set('test_key', 'Hello from Redis!');
    const value = await redis.get('test_key');
    
    res.json({ 
      redis: 'connected',
      test: value
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al conectar con Redis' });
  }
});

// Iniciar servidor
const startServer = async () => {
  await connectMongoDB();
  
  app.listen(PORT, () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Endpoints disponibles:');
    console.log(`   GET  http://localhost:${PORT}/`);
    console.log(`   GET  http://localhost:${PORT}/health`);
    console.log(`   GET  http://localhost:${PORT}/test/mongo`);
    console.log(`   GET  http://localhost:${PORT}/test/redis`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });
};

startServer();