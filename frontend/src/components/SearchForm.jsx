import React, { useState, useEffect, useRef } from 'react';

const SearchForm = ({ onSearch, onSuggestions, loading }) => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [useCache, setUseCache] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayedSuggestions = setTimeout(async () => {
      if (query.length >= 2) {
        try {
          const suggestionsList = await onSuggestions(query);
          setSuggestions(suggestionsList);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error getting suggestions:', error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(delayedSuggestions);
  }, [query, onSuggestions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query, page, limit, useCache);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion, 1, limit, useCache);
  };

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setPage(1);
  };

  return (
    <div className="box">
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label is-large">
            <span className="icon">
              <i className="fas fa-search"></i>
            </span>
            Búsqueda de Productos
          </label>
          
          <div className="field has-addons">
            <div className="control has-icons-left is-expanded" ref={suggestionsRef}>
              <input
                className="input is-large"
                type="text"
                placeholder="Buscar productos por título, categoría, marca, SKU o tipo..."
                value={query}
                onChange={handleQueryChange}
                disabled={loading}
              />
              <span className="icon is-left">
                <i className="fas fa-search"></i>
              </span>
              
              {/* Sugerencias */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="dropdown is-active" style={{ width: '100%', position: 'absolute', zIndex: 1000 }}>
                  <div className="dropdown-menu" style={{ width: '100%' }}>
                    <div className="dropdown-content">
                      {suggestions.map((suggestion, index) => (
                        <a
                          key={index}
                          className="dropdown-item"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <span className="icon is-small">
                            <i className="fas fa-lightbulb"></i>
                          </span>
                          {suggestion}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="control">
              <button
                type="submit"
                className={`button is-primary is-large ${loading ? 'is-loading' : ''}`}
                disabled={loading || !query.trim()}
              >
                <span className="icon">
                  <i className="fas fa-search"></i>
                </span>
                <span>Buscar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Opciones avanzadas */}
        <div className="field">
          <div className="level">
            <div className="level-left">
              <div className="level-item">
                <button
                  type="button"
                  className="button is-text"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <span className="icon">
                    <i className={`fas fa-chevron-${showAdvanced ? 'up' : 'down'}`}></i>
                  </span>
                  <span>Opciones avanzadas</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de opciones avanzadas */}
        {showAdvanced && (
          <div className="box is-light">
            <div className="columns is-variable is-4">
              <div className="column">
                <div className="field">
                  <label className="label">Resultados por página</label>
                  <div className="control">
                    <div className="select is-fullwidth">
                      <select
                        value={limit}
                        onChange={(e) => setLimit(parseInt(e.target.value))}
                      >
                        <option value={10}>10 productos</option>
                        <option value={20}>20 productos</option>
                        <option value={50}>50 productos</option>
                        <option value={100}>100 productos</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="column">
                <div className="field">
                  <label className="label">Configuración de cache</label>
                  <div className="control">
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={useCache}
                        onChange={(e) => setUseCache(e.target.checked)}
                      />
                      <span className="ml-2">Usar cache para búsquedas rápidas</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="field">
              <div className="content is-small">
                <p><strong>Jerarquía de búsqueda:</strong></p>
                <ol>
                  <li><strong>Título:</strong> Peso 10 - Mayor relevancia</li>
                  <li><strong>Categoría:</strong> Peso 5</li>
                  <li><strong>Marca:</strong> Peso 3</li>
                  <li><strong>SKU:</strong> Peso 2</li>
                  <li><strong>Tipo de producto:</strong> Peso 1 - Menor relevancia</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchForm;