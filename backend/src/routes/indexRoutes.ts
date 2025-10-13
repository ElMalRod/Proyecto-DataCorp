import { Router } from 'express';
import { IndexController } from '../controllers/IndexController.js';

const router = Router();
const indexController = new IndexController();

// POST /index/load - Cargar datos desde CSV
router.post('/load', async (req, res) => {
  await indexController.loadData(req, res);
});

// GET /index/stats - Obtener estadísticas de carga
router.get('/stats', async (req, res) => {
  await indexController.getLoadStats(req, res);
});

export default router;