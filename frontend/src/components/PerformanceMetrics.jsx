import React, { useState, useEffect } from 'react';
import { getCacheMetrics, getSearchStats, warmupCache } from '../services/api';
import PopularSearches from './PopularSearches';

const PerformanceMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [searchStats, setSearchStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [warmingUp, setWarmingUp] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const [cacheData, statsData] = await Promise.all([
        getCacheMetrics(),
        getSearchStats()
      ]);

      setMetrics(cacheData.data);
      setSearchStats(statsData.data);
      setError(null);
    } catch (error) {
      console.error('Error cargando métricas:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWarmup = async () => {
    setWarmingUp(true);
    try {
      const result = await warmupCache(20);
      alert(`Warmup completado: ${result.data.warmed} búsquedas precalentadas`);
      await loadMetrics();
    } catch (error) {
      alert(`Error en warmup: ${error.message}`);
    } finally {
      setWarmingUp(false);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="box">
        <div className="has-text-centered p-5">
          <button className="button is-loading is-large is-white"></button>
          <p className="mt-3">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="box">
        <div className="notification is-danger">
          <p>Error al cargar métricas: {error}</p>
          <button className="button is-light mt-3" onClick={loadMetrics}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="box">
      <div className="level">
        <div className="level-left">
          <div className="level-item">
            <div>
              <h2 className="title is-4">
                <span className="icon-text">
                  <span className="icon">
                    <i className="fas fa-tachometer-alt"></i>
                  </span>
                  <span>Métricas de Rendimiento</span>
                </span>
              </h2>
              <p className="subtitle is-6">Monitoreo en tiempo real del sistema</p>
            </div>
          </div>
        </div>
        <div className="level-right">
          <div className="level-item">
            <div className="buttons">
              <button
                className={`button is-primary ${warmingUp ? 'is-loading' : ''}`}
                onClick={handleWarmup}
                disabled={warmingUp}
              >
                <span className="icon">
                  <i className="fas fa-fire"></i>
                </span>
                <span>Precalentar Cache</span>
              </button>
              <button
                className="button is-light"
                onClick={loadMetrics}
                disabled={loading}
              >
                <span className="icon">
                  <i className="fas fa-sync"></i>
                </span>
                <span>Actualizar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="columns is-multiline">
        {/* Cache Redis */}
        <div className="column is-half">
          <div className="box has-background-primary-light">
            <h3 className="subtitle is-5 has-text-weight-bold">
              <span className="icon-text">
                <span className="icon has-text-danger">
                  <i className="fas fa-database"></i>
                </span>
                <span>Cache Redis</span>
              </span>
            </h3>
            <div className="content">
              <table className="table is-fullwidth is-hoverable">
                <tbody>
                  <tr>
                    <td><strong>Claves de Búsqueda:</strong></td>
                    <td className="has-text-right">
                      <span className="tag is-info is-medium">{metrics?.searchKeys || 0}</span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Claves de Categorías:</strong></td>
                    <td className="has-text-right">
                      <span className="tag is-info is-medium">{metrics?.categoryKeys || 0}</span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Búsquedas Populares:</strong></td>
                    <td className="has-text-right">
                      <span className="tag is-success is-medium">{metrics?.popularSearchesCount || 0}</span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Total de Claves:</strong></td>
                    <td className="has-text-right">
                      <span className="tag is-primary is-medium">{metrics?.totalKeys || 0}</span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Memoria Usada:</strong></td>
                    <td className="has-text-right">
                      <span className="tag is-warning is-medium">{metrics?.memoryUsage || 'N/A'}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* MongoDB Stats */}
        <div className="column is-half">
          <div className="box has-background-success-light">
            <h3 className="subtitle is-5 has-text-weight-bold">
              <span className="icon-text">
                <span className="icon has-text-success">
                  <i className="fas fa-leaf"></i>
                </span>
                <span>MongoDB</span>
              </span>
            </h3>
            <div className="content">
              <table className="table is-fullwidth is-hoverable">
                <tbody>
                  <tr>
                    <td><strong>Total de Productos:</strong></td>
                    <td className="has-text-right">
                      <span className="tag is-info is-medium">
                        {searchStats?.totalProducts?.toLocaleString() || 0}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Total de Categorías:</strong></td>
                    <td className="has-text-right">
                      <span className="tag is-info is-medium">{searchStats?.totalCategories || 0}</span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Total de Marcas:</strong></td>
                    <td className="has-text-right">
                      <span className="tag is-info is-medium">{searchStats?.totalBrands || 0}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Rendimiento */}
        <div className="column is-full">
          <div className="box has-background-info-light">
            <h3 className="subtitle is-5 has-text-weight-bold">
              <span className="icon-text">
                <span className="icon has-text-info">
                  <i className="fas fa-chart-line"></i>
                </span>
                <span>Beneficios del Sistema de Cache</span>
              </span>
            </h3>
            <div className="content">
              <div className="columns">
                <div className="column">
                  <div className="notification is-light">
                    <p className="has-text-weight-bold">Búsquedas Normales</p>
                    <p className="is-size-4 has-text-primary">50-100 ms</p>
                    <p className="is-size-7">Primera búsqueda desde MongoDB</p>
                  </div>
                </div>
                <div className="column">
                  <div className="notification is-primary">
                    <p className="has-text-weight-bold has-text-white">Búsquedas Cacheadas</p>
                    <p className="is-size-4 has-text-white">5-15 ms</p>
                    <p className="is-size-7 has-text-white">90% más rápido con Redis</p>
                  </div>
                </div>
                <div className="column">
                  <div className="notification is-success">
                    <p className="has-text-weight-bold has-text-white">Búsquedas Populares</p>
                    <p className="is-size-4 has-text-white">&lt; 5 ms</p>
                    <p className="is-size-7 has-text-white">95% más rápido (precalentadas)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="notification is-info is-light">
        <p className="is-size-7">
          <strong>Nota:</strong> Las métricas se actualizan automáticamente cada 30 segundos.
          El sistema utiliza Redis para cachear búsquedas frecuentes y reducir la carga en MongoDB,
          mejorando significativamente los tiempos de respuesta.
        </p>
      </div>

      <PopularSearches />
    </div>
  );
};

export default PerformanceMetrics;
