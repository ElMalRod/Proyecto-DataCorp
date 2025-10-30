import { Router } from 'express';
import { CacheController } from '../controllers/CacheController.js';

const router = Router();
const cacheController = new CacheController();

// GET /cache/metrics - Obtener métricas del sistema de cache
router.get('/metrics', async (req, res) => {
  await cacheController.getMetrics(req, res);
});

// POST /cache/clear - Limpiar cache selectivamente
router.post('/clear', async (req, res) => {
  await cacheController.clearCache(req, res);
});

// POST /cache/warmup - Ejecutar warmup completo
router.post('/warmup', async (req, res) => {
  await cacheController.performWarmup(req, res);
});

export default router;
