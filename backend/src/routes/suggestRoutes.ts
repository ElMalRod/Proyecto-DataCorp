import { Router } from 'express';
import { SearchController } from '../controllers/SearchController.js';

const router = Router();
const searchController = new SearchController();

// GET /suggest?q=query&limit=10 - Autocompletado/sugerencias
router.get('/', async (req, res) => {
  await searchController.suggest(req, res);
});

export default router;