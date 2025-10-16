import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController.js';

const router = Router();
const categoryController = new CategoryController();

// GET /categories/search - Buscar productos por categoría con paginación
router.get('/search', async (req, res) => {
  await categoryController.searchByCategory(req, res);
});

// GET /categories - Obtener todas las categorías disponibles
router.get('/', async (req, res) => {
  await categoryController.getCategories(req, res);
});

// GET /categories/stats - Obtener estadísticas de categorías
router.get('/stats', async (req, res) => {
  await categoryController.getCategoryStats(req, res);
});

// DELETE /categories/cache - Limpiar caché de categorías
router.delete('/cache', async (req, res) => {
  await categoryController.clearCache(req, res);
});

export default router;