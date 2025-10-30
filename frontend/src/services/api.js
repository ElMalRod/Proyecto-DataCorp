import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 segundos para búsquedas complejas
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cliente especial para operaciones de carga con timeout extendido
const apiLoadData = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutos para operaciones de carga
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejar errores globalmente
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Error desconocido';
    throw new Error(message);
  }
);

// Interceptor para cliente de carga de datos
apiLoadData.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Error desconocido';
    throw new Error(message);
  }
);

export const searchProducts = async (query, page = 1, limit = 20, useCache = true) => {
  const params = new URLSearchParams({
    q: query,
    page: page.toString(),
    limit: limit.toString(),
    cache: useCache.toString()
  });
  
  return await api.get(`/search?${params}`);
};

export const getSuggestions = async (query, limit = 10) => {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString()
  });
  
  return await api.get(`/suggest?${params}`);
};

export const loadData = async () => {
  return await apiLoadData.post('/index/load');
};

export const getLoadStats = async () => {
  return await api.get('/index/stats');
};

export const getSearchStats = async () => {
  return await api.get('/search/stats');
};

export const getSystemHealth = async () => {
  return await api.get('/health');
};

export const getApiInfo = async () => {
  return await api.get('/');
};

// Nuevas funciones para categorías
export const getCategories = async () => {
  return await api.get('/categories');
};

export const searchByCategory = async (category = 'all', page = 1, limit = 10, sortBy = 'title', sortOrder = 'asc') => {
  const params = new URLSearchParams({
    category,
    page: page.toString(),
    limit: limit.toString(),
    sortBy,
    sortOrder
  });
  
  return await api.get(`/categories/search?${params}`);
};

export const getCategoryStats = async () => {
  return await api.get('/categories/stats');
};

export const clearCategoryCache = async () => {
  return await api.delete('/categories/cache');
};

// Función para resetear rate limits
export const resetRateLimits = async () => {
  return await api.post('/index/reset-limits');
};

// Nuevas funciones para optimizaciones Redis y métricas
export const getPopularSearches = async (limit = 10) => {
  const params = new URLSearchParams({
    limit: limit.toString()
  });
  return await api.get(`/search/popular?${params}`);
};

export const warmupCache = async (topN = 20) => {
  const params = new URLSearchParams({
    topN: topN.toString()
  });
  return await api.post(`/search/warmup?${params}`);
};

export const getCacheMetrics = async () => {
  return await api.get('/cache/metrics');
};

export default api;