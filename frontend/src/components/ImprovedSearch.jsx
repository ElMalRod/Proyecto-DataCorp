import React, { useState, useEffect, useRef } from 'react';
import { searchProducts, getSuggestions, getCategories, searchByCategory } from '../services/api';

const ImprovedSearch = () => {
  // Estados básicos
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados de resultados
  const [searchResults, setSearchResults] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchPerformance, setSearchPerformance] = useState(null);
  const [warning, setWarning] = useState(null);
  
  // Estados de autocompletado
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Estados de filtros
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [limit, setLimit] = useState(12);
  
  // Referencias
  const suggestionsRef = useRef(null);

  // Estados de inicialización
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    loadCategories();
    setIsInitialized(true);
  }, []);

  // Efecto para búsqueda automática cuando cambia la categoría
  useEffect(() => {
    if (!isInitialized) return; // Evitar búsqueda en el primer render
    
    if (selectedCategory !== 'all') {
      // Si hay una categoría seleccionada, hacer búsqueda automática
      handleSearch('', 1);
    } else if (query.trim()) {
      // Si volvemos a "all" pero hay texto de búsqueda, buscar por texto
      handleSearch(query, 1);
    } else {
      // Si volvemos a "all" y no hay query, limpiar resultados
      setSearchResults([]);
      setPagination(null);
    }
  }, [selectedCategory]);

  // Efecto para búsqueda automática cuando cambia el límite de productos por página
  useEffect(() => {
    if (!isInitialized) return; // Evitar búsqueda en el primer render
    
    if (searchResults.length > 0) {
      // Solo si ya hay resultados, volver a buscar con el nuevo límite
      if (selectedCategory !== 'all' && !query.trim()) {
        handleSearch('', 1);
      } else if (query.trim()) {
        handleSearch(query, 1);
      }
    }
  }, [limit]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocompletado como el original
  useEffect(() => {
    const delayedSuggestions = setTimeout(async () => {
      if (query.length >= 2) {
        try {
          const response = await getSuggestions(query, 8);
          console.log('Suggestions response:', response); // Debug
          
          // El endpoint de sugerencias puede devolver:
          // response.data.suggestions = [...] o response.suggestions = [...]
          const suggestionsArray = response.data?.suggestions || response.suggestions || [];
          setSuggestions(suggestionsArray);
          setShowSuggestions(suggestionsArray.length > 0);
        } catch (error) {
          console.error('Error getting suggestions:', error);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(delayedSuggestions);
  }, [query]);

  const loadCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(['all', ...(response.data || [])]);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSearch = async (searchQuery = query, page = 1) => {
    if (!searchQuery.trim() && selectedCategory === 'all') return;

    setLoading(true);
    setError(null);
    setWarning(null);

    // Advertencia para búsquedas muy largas
    if (searchQuery.length > 100) {
      setWarning('La búsqueda es muy larga (>100 caracteres). Se truncará para optimizar el rendimiento.');
    } else if (searchQuery.length > 50) {
      setWarning('Búsqueda larga detectada. Puede tardar más tiempo del usual.');
    }

    try {
      let response;
      
      console.log('Searching with:', { searchQuery, selectedCategory, page, limit });
      
      if (selectedCategory !== 'all' && !searchQuery.trim()) {
        // Búsqueda por categoría solamente
        console.log('Using category search');
        response = await searchByCategory(selectedCategory, page, limit);
        setSearchResults(response.data || []);
        setPagination(response.pagination || null);

        // Extraer métricas de rendimiento
        if (response.searchTime !== undefined) {
          setSearchPerformance({
            searchTime: response.searchTime,
            fromCache: response.fromCache || false
          });
        }
      } else {
        // Búsqueda por texto (estructura original)
        console.log('Using text search for query:', searchQuery);
        response = await searchProducts(searchQuery, page, limit);
        console.log('Search response:', response); // Para debug

        // La estructura del backend de búsqueda es:
        // response.data = { products: [...], page, totalPages, etc }
        // response.meta = { pagination: {...}, performance: {...} }

        if (response.data && response.data.products) {
          // Productos están en response.data.products
          setSearchResults(response.data.products);

          // Paginación está en response.meta.pagination
          const paginationData = response.meta?.pagination;
          if (paginationData) {
            setPagination({
              page: paginationData.currentPage,
              limit: paginationData.itemsPerPage,
              total: paginationData.totalItems,
              totalPages: paginationData.totalPages,
              hasNext: paginationData.hasNextPage,
              hasPrev: paginationData.hasPrevPage
            });
          } else {
            // Fallback con los datos directos de response.data
            setPagination({
              page: response.data.page || 1,
              limit: response.data.limit || limit,
              total: response.data.totalCount || 0,
              totalPages: response.data.totalPages || 1,
              hasNext: response.data.page < response.data.totalPages,
              hasPrev: response.data.page > 1
            });
          }

          // Extraer métricas de rendimiento
          const perfData = response.meta?.performance;
          if (perfData) {
            setSearchPerformance({
              searchTime: parseInt(perfData.searchTime) || 0,
              fromCache: perfData.fromCache || false
            });
          }
        } else {
          console.warn('Unexpected response structure:', response);
          setSearchResults([]);
          setPagination(null);
          setSearchPerformance(null);
        }
      }

      setShowSuggestions(false);
      
    } catch (error) {
      setError('Error al realizar la búsqueda: ' + error.message);
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    handleSearch(suggestion);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedCategory(category);
    // Limpiar query cuando se selecciona una categoría
    if (category !== 'all') {
      setQuery('');
    }
    // El useEffect se encargará de la búsqueda automática
  };

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value);
    setLimit(newLimit);
    // El useEffect se encargará de la búsqueda automática
  };

  const handlePageChange = (newPage) => {
    if (selectedCategory !== 'all' && !query.trim()) {
      // Navegación por categoría
      handleSearch('', newPage);
    } else {
      // Navegación por búsqueda
      handleSearch(query, newPage);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCategoryDisplayName = (category) => {
    if (category === 'all') return 'Todas las categorías';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <div className="improved-search">
      {/* Formulario de búsqueda principal */}
      <form onSubmit={handleSubmit} className="box mb-5">
        <div className="field">
          <label className="label is-medium">
            <span className="icon-text">
              <span className="icon">
                <i className="fas fa-search"></i>
              </span>
              <span>Búsqueda de Productos</span>
            </span>
          </label>
          
          <div className="field has-addons">
            <div className="control has-icons-left is-expanded" ref={suggestionsRef}>
              <input
                className="input is-large"
                type="text"
                placeholder="Buscar productos por título, categoría, marca, SKU..."
                value={query}
                onChange={handleQueryChange}
                disabled={loading}
                autoComplete="off"
              />
              <span className="icon is-left">
                <i className="fas fa-search"></i>
              </span>
              
              {/* Sugerencias con estilo original */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="dropdown is-active" style={{ 
                  width: '100%', 
                  position: 'absolute', 
                  zIndex: 1000,
                  top: '100%'
                }}>
                  <div className="dropdown-menu" style={{ width: '100%' }}>
                    <div className="dropdown-content">
                      {suggestions.map((suggestion, index) => (
                        <a
                          key={index}
                          className="dropdown-item"
                          onClick={() => handleSuggestionClick(suggestion)}
                          style={{ cursor: 'pointer' }}
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
                disabled={loading}
              >
                <span className="icon">
                  <i className="fas fa-search"></i>
                </span>
                <span>Buscar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="columns">
          <div className="column is-half">
            <div className="field">
              <label className="label">
                Filtrar por categoría:
                {loading && selectedCategory !== 'all' && (
                  <span className="tag is-primary is-small ml-2">
                    <span className="icon is-small">
                      <i className="fas fa-sync fa-spin"></i>
                    </span>
                    <span>Filtrando...</span>
                  </span>
                )}
              </label>
              <div className="control">
                <div className="select is-fullwidth">
                  <select 
                    value={selectedCategory} 
                    onChange={handleCategoryChange}
                    disabled={loading}
                  >
                    {categories.map((category, index) => (
                      <option key={index} value={category}>
                        {getCategoryDisplayName(category)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="column">
            <div className="field">
              <label className="label">
                Productos por página:
                {loading && (
                  <span className="tag is-info is-small ml-2">
                    <span className="icon is-small">
                      <i className="fas fa-sync fa-spin"></i>
                    </span>
                    <span>Actualizando...</span>
                  </span>
                )}
              </label>
              <div className="control">
                <div className="select is-fullwidth">
                  <select 
                    value={limit} 
                    onChange={handleLimitChange}
                    disabled={loading}
                  >
                    <option value={12}>12 productos</option>
                    <option value={24}>24 productos</option>
                    <option value={48}>48 productos</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Mensaje de filtrado automático */}
      {(selectedCategory !== 'all' || query.trim()) && !loading && (
        <div className="notification is-info is-light mb-4">
          <div className="level is-mobile">
            <div className="level-left">
              <div className="level-item">
                <span className="icon">
                  <i className="fas fa-info-circle"></i>
                </span>
                <span>
                  {selectedCategory !== 'all' && !query.trim() && 
                    `Mostrando productos de la categoría "${getCategoryDisplayName(selectedCategory)}"`
                  }
                  {query.trim() && selectedCategory === 'all' &&
                    `Resultados de búsqueda para "${query}"`
                  }
                  {query.trim() && selectedCategory !== 'all' &&
                    `Buscando "${query}" en categoría "${getCategoryDisplayName(selectedCategory)}"`
                  }
                </span>
              </div>
            </div>
            <div className="level-right">
              <div className="level-item">
                <button 
                  className="button is-small is-info is-outlined"
                  onClick={() => {
                    setQuery('');
                    setSelectedCategory('all');
                    setSearchResults([]);
                    setPagination(null);
                  }}
                >
                  <span className="icon is-small">
                    <i className="fas fa-times"></i>
                  </span>
                  <span>Limpiar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Información de resultados */}
      {pagination && (
        <div className="level mb-4">
          <div className="level-left">
            <div className="level-item">
              <span className="tag is-primary is-medium">
                {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} productos
              </span>
            </div>
          </div>
          <div className="level-right">
            <div className="level-item">
              {selectedCategory !== 'all' ? (
                <span className="tag is-info">Categoría: {getCategoryDisplayName(selectedCategory)}</span>
              ) : query && (
                <span className="tag is-info">Búsqueda: "{query}"</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Métricas de rendimiento */}
      {searchPerformance && (
        <div className="notification is-light mb-4">
          <div className="level is-mobile">
            <div className="level-left">
              <div className="level-item">
                <span className="icon has-text-info">
                  <i className="fas fa-tachometer-alt"></i>
                </span>
                <span className="ml-2">
                  <strong>Tiempo de búsqueda:</strong> {searchPerformance.searchTime}ms
                </span>
              </div>
              <div className="level-item">
                {searchPerformance.fromCache ? (
                  <span className="tag is-success">
                    <span className="icon">
                      <i className="fas fa-bolt"></i>
                    </span>
                    <span>Desde Cache (Redis)</span>
                  </span>
                ) : (
                  <span className="tag is-info">
                    <span className="icon">
                      <i className="fas fa-database"></i>
                    </span>
                    <span>Desde MongoDB</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensajes de advertencia */}
      {warning && (
        <div className="notification is-warning is-light">
          <button className="delete" onClick={() => setWarning(null)}></button>
          <span className="icon">
            <i className="fas fa-exclamation-triangle"></i>
          </span>
          <span>{warning}</span>
        </div>
      )}

      {/* Mensajes de error */}
      {error && (
        <div className="notification is-danger">
          <button className="delete" onClick={() => setError(null)}></button>
          {error}
        </div>
      )}

      {/* Estado de carga */}
      {loading && (
        <div className="has-text-centered p-6">
          <button className="button is-loading is-large is-white"></button>
          <p className="mt-3">Buscando productos...</p>
        </div>
      )}

      {/* Resultados */}
      {!loading && searchResults.length > 0 && (
        <>
          <div className="columns is-multiline">
            {searchResults.map((product, index) => (
              <div key={index} className="column is-4-desktop is-6-tablet is-12-mobile">
                <div className="card product-card h-100">
                  <div className="card-content">
                    <div className="media">
                      <div className="media-content">
                        <p className="title is-6">{product.title}</p>
                        <p className="subtitle is-7">
                          <span className="tag is-primary is-light mr-2">{product.category}</span>
                          <span className="tag is-info is-light">{product.brand}</span>
                        </p>
                      </div>
                    </div>

                    <div className="content">
                      <div className="field is-grouped is-grouped-multiline">
                        <div className="control">
                          <div className="tags has-addons">
                            <span className="tag is-dark">SKU</span>
                            <span className="tag is-light">{product.sku}</span>
                          </div>
                        </div>
                        <div className="control">
                          <div className="tags has-addons">
                            <span className="tag is-dark">Tipo</span>
                            <span className="tag is-light">{product.product_type}</span>
                          </div>
                        </div>
                      </div>

                      {product.price && (
                        <p className="has-text-weight-bold has-text-success mb-2">
                          ${product.price.toLocaleString()}
                        </p>
                      )}
                      
                      {product.description && (
                        <p className="is-size-7 has-text-grey">
                          {product.description.length > 100 
                            ? product.description.substring(0, 100) + '...' 
                            : product.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          {pagination && pagination.totalPages > 1 && (
            <nav className="pagination is-centered mt-5" role="navigation">
              <button
                className="pagination-previous"
                disabled={!pagination.hasPrev}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Anterior
              </button>
              <button
                className="pagination-next"
                disabled={!pagination.hasNext}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Siguiente
              </button>
              <ul className="pagination-list">
                {[...Array(Math.min(pagination.totalPages, 5))].map((_, index) => {
                  const pageNumber = Math.max(1, pagination.page - 2) + index;
                  if (pageNumber <= pagination.totalPages) {
                    return (
                      <li key={index}>
                        <button
                          className={`pagination-link ${pageNumber === pagination.page ? 'is-current' : ''}`}
                          onClick={() => handlePageChange(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      </li>
                    );
                  }
                  return null;
                })}
              </ul>
            </nav>
          )}
        </>
      )}

      {/* Sin resultados */}
      {!loading && searchResults.length === 0 && (query || selectedCategory !== 'all') && (
        <div className="has-text-centered p-6">
          <span className="icon is-large has-text-grey-light">
            <i className="fas fa-search fa-3x"></i>
          </span>
          <p className="title is-4 has-text-grey">No se encontraron productos</p>
          <p className="subtitle is-6 has-text-grey">
            Intenta con otros términos de búsqueda
          </p>
        </div>
      )}

      {/* Estado inicial */}
      {!loading && searchResults.length === 0 && !query && selectedCategory === 'all' && (
        <div className="has-text-centered p-6">
          <span className="icon is-large has-text-primary">
            <i className="fas fa-search fa-3x"></i>
          </span>
          <p className="title is-4">Buscar Productos</p>
          <p className="subtitle is-6 has-text-grey">
            Ingresa un término de búsqueda o selecciona una categoría
          </p>
        </div>
      )}
    </div>
  );
};

export default ImprovedSearch;