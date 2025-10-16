import React, { useState, useEffect, useRef } from 'react';
import { loadData, getLoadStats, resetRateLimits } from '../services/api';

const LoadData = ({ onLoadComplete }) => {
  const [loading, setLoading] = useState(false);
  const [loadResult, setLoadResult] = useState(null);
  const [loadStats, setLoadStats] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Limpiar intervalos al desmontar el componente
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Verificar si hay una carga en progreso al montar el componente
  useEffect(() => {
    const checkLoadingStatus = async () => {
      try {
        const stats = await getLoadStats();
        if (stats.data) {
          setLoadStats(stats);
        }
      } catch (error) {
        console.log('No se pudieron obtener estadísticas iniciales');
      }
    };
    
    checkLoadingStatus();
  }, []);

  const startProgressPolling = () => {
    startTimeRef.current = Date.now();
    setTimeElapsed(0);
    
    // Actualizar tiempo transcurrido cada segundo
    intervalRef.current = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimeElapsed(elapsed);
      
      // Obtener estadísticas de progreso cada 5 segundos
      if (elapsed % 5 === 0) {
        try {
          const stats = await getLoadStats();
          if (stats.data) {
            setProgress(stats.data);
          }
        } catch (error) {
          // Silenciar errores de polling para no interrumpir la carga
          console.log('Polling stats:', error.message);
        }
      }
    }, 1000);
  };

  const stopProgressPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleLoadData = async () => {
    setLoading(true);
    setError(null);
    setLoadResult(null);
    setProgress(null);
    
    startProgressPolling();

    try {
      console.log('Iniciando carga de datos...');
      const result = await loadData();
      console.log('Carga completada:', result);
      setLoadResult(result);
      
      // Obtener estadísticas finales después de la carga
      const stats = await getLoadStats();
      setLoadStats(stats);
      
      if (onLoadComplete) {
        onLoadComplete();
      }
    } catch (error) {
      console.error('Error en carga:', error);
      
      // Si es un error 429 (rate limit), intentar resetear automáticamente
      if (error.message.includes('Demasiadas solicitudes') || error.message.includes('429')) {
        console.log('Detectado error de rate limit, intentando resetear...');
        try {
          await resetRateLimits();
          setError('Rate limit reseteado. Puedes intentar cargar los datos nuevamente.');
        } catch (resetError) {
          setError(`Error de rate limit. ${error.message}. Intenta nuevamente en unos minutos.`);
        }
      } else {
        setError(error.message);
      }
    } finally {
      stopProgressPolling();
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

        <div className="control">
          <button 
            className="button is-warning"
            onClick={async () => {
              try {
                await resetRateLimits();
                setError(null);
                alert('Rate limits reseteados exitosamente');
              } catch (error) {
                setError('Error reseteando rate limits: ' + error.message);
              }
            }}
            disabled={loading}
          >
            <span className="icon">
              <i className="fas fa-refresh"></i>
            </span>
            <span>Resetear Límites</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="notification is-warning mt-4">
          <div className="level is-mobile">
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
            <div className="level-right">
              <div className="level-item">
                <span className="tag is-warning is-medium">
                  <span className="icon">
                    <i className="fas fa-clock"></i>
                  </span>
                  <span>{Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}</span>
                </span>
              </div>
            </div>
          </div>
          
          {progress && (
            <div className="content mt-3">
              <div className="columns is-mobile">
                <div className="column">
                  <div className="has-text-centered">
                    <p className="heading">Procesados</p>
                    <p className="title is-4">{progress.totalProcessed?.toLocaleString() || '0'}</p>
                  </div>
                </div>
                <div className="column">
                  <div className="has-text-centered">
                    <p className="heading">Insertados</p>
                    <p className="title is-4 has-text-success">{progress.totalInserted?.toLocaleString() || '0'}</p>
                  </div>
                </div>
                <div className="column">
                  <div className="has-text-centered">
                    <p className="heading">Errores</p>
                    <p className="title is-4 has-text-danger">{progress.errors || '0'}</p>
                  </div>
                </div>
                <div className="column">
                  <div className="has-text-centered">
                    <p className="heading">Velocidad</p>
                    <p className="title is-6">{progress.rate || 'Calculando...'}</p>
                  </div>
                </div>
              </div>
              
              {progress.totalProcessed && (
                <div className="mt-3">
                  <div className="level is-mobile">
                    <div className="level-left">
                      <div className="level-item">
                        <span className="has-text-weight-semibold">Progreso estimado:</span>
                      </div>
                    </div>
                    <div className="level-right">
                      <div className="level-item">
                        <span>{((progress.totalProcessed / 2000000) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <progress 
                    className="progress is-success" 
                    value={progress.totalProcessed} 
                    max="2000000"
                  >
                    {((progress.totalProcessed / 2000000) * 100).toFixed(1)}%
                  </progress>
                </div>
              )}
            </div>
          )}
          
          {!progress && (
            <div className="mt-3">
              <progress className="progress is-warning" max="100">Iniciando...</progress>
              <p className="help has-text-centered mt-2">
                Conectando con el servidor y preparando la carga...
              </p>
            </div>
          )}
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
          
          {error.includes('timeout') && (
            <div className="content mt-3">
              <div className="notification is-info is-light">
                <h6 className="title is-6">
                  <span className="icon">
                    <i className="fas fa-info-circle"></i>
                  </span>
                  ℹ️ Timeout del Frontend
                </h6>
                <p>
                  <strong>El proceso puede estar continuando en el backend.</strong> 
                  El frontend perdió conexión después de 5 minutos, pero la carga puede seguir ejecutándose.
                </p>
                <p>
                  <strong>¿Qué hacer?</strong>
                </p>
                <ul>
                  <li>Espera unos minutos más y haz clic en "Ver Estadísticas" para verificar</li>
                  <li>Revisa la terminal del backend para ver el progreso real</li>
                  <li>La carga completa puede tomar entre 3-4 minutos</li>
                </ul>
              </div>
            </div>
          )}
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