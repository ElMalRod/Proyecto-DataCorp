import React, { useState } from 'react';
import { loadData, getLoadStats } from '../services/api';

const LoadData = ({ onLoadComplete }) => {
  const [loading, setLoading] = useState(false);
  const [loadResult, setLoadResult] = useState(null);
  const [loadStats, setLoadStats] = useState(null);
  const [error, setError] = useState(null);

  const handleLoadData = async () => {
    setLoading(true);
    setError(null);
    setLoadResult(null);

    try {
      const result = await loadData();
      setLoadResult(result);
      
      // Obtener estadísticas después de la carga
      const stats = await getLoadStats();
      setLoadStats(stats);
      
      if (onLoadComplete) {
        onLoadComplete();
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStats = async () => {
    try {
      const stats = await getLoadStats();
      setLoadStats(stats);
    } catch (error) {
      setError('Error al obtener estadísticas: ' + error.message);
    }
  };

  return (
    <div className="box">
      <h2 className="title is-4">
        <span className="icon">
          <i className="fas fa-upload"></i>
        </span>
        Carga de Datos CSV
      </h2>

      <div className="content">
        <p>
          Este proceso carga los productos desde el archivo CSV ubicado en 
          <code>backend/data/productos_2m.csv</code> hacia la base de datos MongoDB.
        </p>
        
        <div className="notification is-info is-light">
          <h6 className="title is-6">
            <span className="icon">
              <i className="fas fa-info-circle"></i>
            </span>
            Información del Proceso
          </h6>
          <ul>
            <li><strong>Procesamiento en lotes:</strong> 10,000 registros por lote</li>
            <li><strong>Manejo de duplicados:</strong> Ignora SKUs existentes</li>
            <li><strong>Índices optimizados:</strong> Se crean después de la carga</li>
            <li><strong>Tiempo estimado:</strong> 2-4 minutos para 1M registros</li>
          </ul>
        </div>
      </div>

      <div className="field is-grouped">
        <div className="control">
          <button 
            className={`button is-primary is-large ${loading ? 'is-loading' : ''}`}
            onClick={handleLoadData}
            disabled={loading}
          >
            <span className="icon">
              <i className="fas fa-play"></i>
            </span>
            <span>Iniciar Carga de Datos</span>
          </button>
        </div>

        <div className="control">
          <button 
            className="button is-info"
            onClick={handleGetStats}
            disabled={loading}
          >
            <span className="icon">
              <i className="fas fa-chart-line"></i>
            </span>
            <span>Ver Estadísticas</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="notification is-warning mt-4">
          <div className="level">
            <div className="level-left">
              <div className="level-item">
                <span className="icon">
                  <i className="fas fa-spinner fa-spin"></i>
                </span>
                <span className="ml-2">
                  <strong>Procesando datos...</strong> Este proceso puede tomar varios minutos.
                </span>
              </div>
            </div>
          </div>
          <progress className="progress is-warning mt-3" max="100">Cargando...</progress>
        </div>
      )}

      {error && (
        <div className="notification is-danger mt-4">
          <button className="delete" onClick={() => setError(null)}></button>
          <h6 className="title is-6">
            <span className="icon">
              <i className="fas fa-exclamation-triangle"></i>
            </span>
            Error en la Carga
          </h6>
          <p>{error}</p>
        </div>
      )}

      {loadResult && (
        <div className="notification is-success mt-4">
          <h6 className="title is-6">
            <span className="icon">
              <i className="fas fa-check-circle"></i>
            </span>
            Carga Completada Exitosamente
          </h6>
          
          <div className="columns">
            <div className="column">
              <div className="level">
                <div className="level-item has-text-centered">
                  <div>
                    <p className="heading">Procesados</p>
                    <p className="title is-5 has-text-success">
                      {loadResult.stats?.totalProcessed?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="level-item has-text-centered">
                  <div>
                    <p className="heading">Insertados</p>
                    <p className="title is-5 has-text-success">
                      {loadResult.stats?.totalInserted?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="level-item has-text-centered">
                  <div>
                    <p className="heading">Duración</p>
                    <p className="title is-5 has-text-info">
                      {loadResult.stats?.duration || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="level-item has-text-centered">
                  <div>
                    <p className="heading">Velocidad</p>
                    <p className="title is-5 has-text-info">
                      {loadResult.stats?.rate || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loadStats && (
        <div className="box mt-4">
          <h6 className="title is-6">
            <span className="icon">
              <i className="fas fa-database"></i>
            </span>
            Estadísticas de la Base de Datos
          </h6>
          
          <div className="columns">
            <div className="column">
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
                  <div className="box is-small">
                    <div className="tags are-small">
                      <span className="tag is-primary">{loadStats.data.sampleProduct.title}</span>
                      <span className="tag is-info">{loadStats.data.sampleProduct.category}</span>
                      <span className="tag is-success">{loadStats.data.sampleProduct.brand}</span>
                    </div>
                    <p className="is-size-7">
                      <strong>SKU:</strong> {loadStats.data.sampleProduct.sku} | 
                      <strong> Tipo:</strong> {loadStats.data.sampleProduct.product_type}
                    </p>
                  </div>
                </div>
              )}

              {loadStats.data?.indexes && (
                <div className="content">
                  <h6 className="subtitle is-6">Índices Creados:</h6>
                  <div className="tags are-small">
                    {loadStats.data.indexes.map((index, i) => (
                      <span key={i} className="tag is-light">
                        <span className="icon is-small">
                          <i className="fas fa-index"></i>
                        </span>
                        {index.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadData;