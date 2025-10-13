import React, { useState, useEffect } from 'react';
import { getLoadStats, getSearchStats, getSystemHealth, getApiInfo } from '../services/api';

const SystemStats = () => {
  const [loadStats, setLoadStats] = useState(null);
  const [searchStats, setSearchStats] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [apiInfo, setApiInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const [loadData, searchData, healthData, infoData] = await Promise.allSettled([
        getLoadStats(),
        getSearchStats(),
        getSystemHealth(),
        getApiInfo()
      ]);

      if (loadData.status === 'fulfilled') setLoadStats(loadData.value);
      if (searchData.status === 'fulfilled') setSearchStats(searchData.value);
      if (healthData.status === 'fulfilled') setSystemHealth(healthData.value);
      if (infoData.status === 'fulfilled') setApiInfo(infoData.value);

      // Check for any errors
      const errors = [loadData, searchData, healthData, infoData]
        .filter(result => result.status === 'rejected')
        .map(result => result.reason?.message)
        .filter(Boolean);

      if (errors.length > 0) {
        setError(errors.join(', '));
      }

    } catch (error) {
      setError('Error al cargar estadísticas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (uptime) => {
    if (!uptime) return 'N/A';
    
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div>
      <div className="level">
        <div className="level-left">
          <div className="level-item">
            <h2 className="title is-4">
              <span className="icon">
                <i className="fas fa-chart-bar"></i>
              </span>
              Estadísticas del Sistema
            </h2>
          </div>
        </div>
        <div className="level-right">
          <div className="level-item">
            <button 
              className={`button is-info ${loading ? 'is-loading' : ''}`}
              onClick={loadAllStats}
              disabled={loading}
            >
              <span className="icon">
                <i className="fas fa-sync-alt"></i>
              </span>
              <span>Actualizar</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="notification is-warning">
          <button className="delete" onClick={() => setError(null)}></button>
          <p>{error}</p>
        </div>
      )}

      <div className="columns">
        {/* Estado del Sistema */}
        <div className="column is-half">
          <div className="box">
            <h6 className="title is-6">
              <span className="icon has-text-info">
                <i className="fas fa-heartbeat"></i>
              </span>
              Estado del Sistema
            </h6>
            
            {systemHealth ? (
              <div>
                <div className="level">
                  <div className="level-item has-text-centered">
                    <div>
                      <p className="heading">Estado General</p>
                      <p className={`title is-5 ${systemHealth.status === 'healthy' ? 'has-text-success' : 'has-text-danger'}`}>
                        <span className="icon">
                          <i className={`fas fa-circle`}></i>
                        </span>
                        {systemHealth.status === 'healthy' ? 'Saludable' : 'Con Problemas'}
                      </p>
                    </div>
                  </div>
                  <div className="level-item has-text-centered">
                    <div>
                      <p className="heading">Tiempo Activo</p>
                      <p className="title is-6 has-text-info">
                        {formatUptime(systemHealth.uptime)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="content">
                  <h6 className="subtitle is-6">Servicios:</h6>
                  <div className="tags">
                    <span className={`tag ${systemHealth.services?.mongodb?.status === 'connected' ? 'is-success' : 'is-danger'}`}>
                      <span className="icon">
                        <i className="fas fa-database"></i>
                      </span>
                      <span>MongoDB: {systemHealth.services?.mongodb?.status || 'Unknown'}</span>
                    </span>
                    <span className={`tag ${systemHealth.services?.redis?.status === 'connected' ? 'is-success' : 'is-danger'}`}>
                      <span className="icon">
                        <i className="fas fa-memory"></i>
                      </span>
                      <span>Redis: {systemHealth.services?.redis?.status || 'Unknown'}</span>
                    </span>
                    <span className={`tag ${systemHealth.services?.products?.loaded ? 'is-success' : 'is-warning'}`}>
                      <span className="icon">
                        <i className="fas fa-box"></i>
                      </span>
                      <span>Productos: {systemHealth.services?.products?.totalCount?.toLocaleString() || 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="has-text-centered py-4">
                <span className="icon is-large has-text-grey-light">
                  <i className="fas fa-spinner fa-spin"></i>
                </span>
                <p>Cargando estado del sistema...</p>
              </div>
            )}
          </div>
        </div>

        {/* Información de la API */}
        <div className="column is-half">
          <div className="box">
            <h6 className="title is-6">
              <span className="icon has-text-primary">
                <i className="fas fa-code"></i>
              </span>
              Información de la API
            </h6>
            
            {apiInfo ? (
              <div className="content">
                <p><strong>Versión:</strong> {apiInfo.version}</p>
                <p><strong>Estado:</strong> {apiInfo.status}</p>
                
                <h6 className="subtitle is-6">Endpoints Disponibles:</h6>
                <div className="tags are-small">
                  {Object.entries(apiInfo.endpoints || {}).map(([key, desc]) => (
                    <span key={key} className="tag is-light">
                      <span className="icon is-small">
                        <i className="fas fa-link"></i>
                      </span>
                      {key}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="has-text-centered py-4">
                <span className="icon is-large has-text-grey-light">
                  <i className="fas fa-spinner fa-spin"></i>
                </span>
                <p>Cargando información de la API...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="columns">
        {/* Estadísticas de Carga */}
        <div className="column is-half">
          <div className="box">
            <h6 className="title is-6">
              <span className="icon has-text-success">
                <i className="fas fa-upload"></i>
              </span>
              Estadísticas de Carga
            </h6>
            
            {loadStats ? (
              <div>
                <div className="level">
                  <div className="level-item has-text-centered">
                    <div>
                      <p className="heading">Total Productos</p>
                      <p className="title is-4 has-text-primary">
                        {loadStats.data?.totalProducts?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {loadStats.data?.sampleProduct && (
                  <div className="content">
                    <h6 className="subtitle is-6">Producto de Muestra:</h6>
                    <div className="notification is-light is-small">
                      <p><strong>{loadStats.data.sampleProduct.title}</strong></p>
                      <div className="tags are-small">
                        <span className="tag is-info">{loadStats.data.sampleProduct.category}</span>
                        <span className="tag is-success">{loadStats.data.sampleProduct.brand}</span>
                        <span className="tag">{loadStats.data.sampleProduct.sku}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="has-text-centered py-4">
                <span className="icon is-large has-text-grey-light">
                  <i className="fas fa-spinner fa-spin"></i>
                </span>
                <p>Cargando estadísticas de carga...</p>
              </div>
            )}
          </div>
        </div>

        {/* Estadísticas de Búsqueda */}
        <div className="column is-half">
          <div className="box">
            <h6 className="title is-6">
              <span className="icon has-text-warning">
                <i className="fas fa-search"></i>
              </span>
              Estadísticas de Búsqueda
            </h6>
            
            {searchStats ? (
              <div className="level">
                <div className="level-item has-text-centered">
                  <div>
                    <p className="heading">Productos</p>
                    <p className="title is-6 has-text-primary">
                      {searchStats.data?.totalProducts?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="level-item has-text-centered">
                  <div>
                    <p className="heading">Categorías</p>
                    <p className="title is-6 has-text-info">
                      {searchStats.data?.totalCategories?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="level-item has-text-centered">
                  <div>
                    <p className="heading">Marcas</p>
                    <p className="title is-6 has-text-success">
                      {searchStats.data?.totalBrands?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="has-text-centered py-4">
                <span className="icon is-large has-text-grey-light">
                  <i className="fas fa-spinner fa-spin"></i>
                </span>
                <p>Cargando estadísticas de búsqueda...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Información Técnica */}
      <div className="box">
        <h6 className="title is-6">
          <span className="icon has-text-grey">
            <i className="fas fa-cogs"></i>
          </span>
          Arquitectura del Sistema
        </h6>
        
        <div className="content">
          <div className="columns">
            <div className="column">
              <h6 className="subtitle is-6">Tecnologías Utilizadas:</h6>
              <div className="tags">
                <span className="tag is-info">
                  <span className="icon"><i className="fab fa-node-js"></i></span>
                  Node.js + TypeScript
                </span>
                <span className="tag is-success">
                  <span className="icon"><i className="fas fa-database"></i></span>
                  MongoDB
                </span>
                <span className="tag is-danger">
                  <span className="icon"><i className="fas fa-memory"></i></span>
                  Redis
                </span>
                <span className="tag is-warning">
                  <span className="icon"><i className="fab fa-react"></i></span>
                  React
                </span>
              </div>
            </div>
            <div className="column">
              <h6 className="subtitle is-6">Características:</h6>
              <ul className="is-size-7">
                <li>Precedencia jerárquica de búsqueda</li>
                <li>Cache inteligente con Redis</li>
                <li>Procesamiento en lotes (10k registros)</li>
                <li>Rate limiting por endpoint</li>
                <li>Autocompletado en tiempo real</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStats;