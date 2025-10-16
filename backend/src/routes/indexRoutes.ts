import { Router } from 'express';
import { IndexController } from '../controllers/IndexController.js';
import { statsRateLimit, loadRateLimit, clearRateLimit } from '../middlewares/rateLimiter.js';

const router = Router();
const indexController = new IndexController();

// POST /index/load - Cargar datos desde CSV (con rate limit específico)
router.post('/load', loadRateLimit, async (req, res) => {
  await indexController.loadData(req, res);
});

// GET /index/stats - Obtener estadísticas de carga (con rate limit específico)
router.get('/stats', statsRateLimit, async (req, res) => {
  await indexController.getLoadStats(req, res);
});

// POST /index/reset-limits - Resetear rate limits (sin rate limit)
router.post('/reset-limits', async (req, res) => {
  try {
    await clearRateLimit(req, 'load');
    await clearRateLimit(req, 'stats');
    
    res.status(200).json({
      success: true,
      message: 'Rate limits reseteados exitosamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error reseteando rate limits: ${error}`,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;