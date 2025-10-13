import { Router } from 'express';
import { SearchController } from '../controllers/SearchController.js';

const router = Router();
const searchController = new SearchController();

// GET /search?q=query&page=1&limit=20 - Búsqueda de productos
router.get('/', async (req, res) => {
  await searchController.search(req, res);
});

// GET /search/stats - Estadísticas de búsqueda
router.get('/stats', async (req, res) => {
  await searchController.getSearchStats(req, res);
});

export default router;