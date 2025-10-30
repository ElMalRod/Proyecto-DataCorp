import React, { useState, useEffect } from 'react';
import { getPopularSearches } from '../services/api';

const PopularSearches = ({ onSearchClick }) => {
  const [popularSearches, setPopularSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPopularSearches();
    const interval = setInterval(loadPopularSearches, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadPopularSearches = async () => {
    try {
      setLoading(true);
      const result = await getPopularSearches(10);
      setPopularSearches(result.data.searches || []);
      setError(null);
    } catch (error) {
      console.error('Error cargando búsquedas populares:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchClick = (query) => {
    if (onSearchClick) {
      onSearchClick(query);
    }
  };

  if (loading && popularSearches.length === 0) {
    return (
      <div className="box">
        <div className="has-text-centered p-4">
          <button className="button is-loading is-large is-white"></button>
          <p className="mt-3">Cargando búsquedas populares...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="box">
        <div className="notification is-warning">
          <p>Error al cargar búsquedas populares: {error}</p>
          <button className="button is-light mt-3" onClick={loadPopularSearches}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (popularSearches.length === 0) {
    return (
      <div className="box">
        <div className="notification is-info is-light">
          <p>No hay búsquedas populares todavía. Realiza algunas búsquedas para ver las tendencias.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="box">
      <h3 className="subtitle is-5 has-text-weight-bold">
        <span className="icon-text">
          <span className="icon has-text-primary">
            <i className="fas fa-fire"></i>
          </span>
          <span>Búsquedas Más Populares</span>
        </span>
      </h3>

      <div className="content">
        <div className="tags">
          {popularSearches.map((search, index) => (
            <span
              key={index}
              className="tag is-medium is-link is-light"
              style={{ cursor: 'pointer', marginBottom: '0.5rem' }}
              onClick={() => handleSearchClick(search.query)}
              title={`${search.count} búsquedas`}
            >
              <span className="icon">
                <i className="fas fa-search"></i>
              </span>
              <span>{search.query}</span>
              <span className="ml-2 has-text-weight-bold">({search.count})</span>
            </span>
          ))}
        </div>
      </div>

      <div className="has-text-right">
        <button
          className="button is-small is-light"
          onClick={loadPopularSearches}
          disabled={loading}
        >
          <span className="icon is-small">
            <i className="fas fa-sync"></i>
          </span>
          <span>Actualizar</span>
        </button>
      </div>

      <div className="notification is-info is-light mt-3">
        <p className="is-size-7">
          <strong>Nota:</strong> Estas son las búsquedas más realizadas por los usuarios.
          Haz clic en cualquier búsqueda para ejecutarla.
        </p>
      </div>
    </div>
  );
};

export default PopularSearches;
