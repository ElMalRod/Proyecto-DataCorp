import React, { useState, useEffect, useRef } from 'react';
import { searchProducts, getSuggestions, getCategories, searchByCategory } from '../services/api';

const UnifiedSearch = () => {
  // Estados de búsqueda
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados de resultados
  const [searchResults, setSearchResults] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchMode, setSearchMode] = useState('all'); // 'all', 'category'
  
  // Estados de categorías
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Estados de configuración
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');
  const [productsPerPage, setProductsPerPage] = useState(12);
  
  // Referencias
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    loadCategories();
  }, []);

  // Ejecutar búsqueda cuando cambian los parámetros de ordenamiento
  useEffect(() => {
    if (searchResults.length > 0) {
      handleSearch(searchMode === 'category' ? '' : query, 1, true);
    }
  }, [sortBy, sortOrder, productsPerPage]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocompletado mejorado
  useEffect(() => {
    const delayedSuggestions = setTimeout(async () => {
      if (query.length >= 2) {
        try {
          const response = await getSuggestions(query, 8);
          // Asegurarse de obtener el array de sugerencias correctamente
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
    }, 300); // Volvemos al delay original para mejor estabilidad

    return () => clearTimeout(delayedSuggestions);
  }, [query]);

  const loadCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(['all', ...response.data]);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSearch = async (searchQuery = query, page = 1, resetResults = true) => {
    if (!searchQuery.trim() && selectedCategory === 'all') return;

    setLoading(true);
    setError(null);
    if (resetResults) {
      setSearchResults([]);
      setPagination(null);
    }

    try {
      let response;
      
      if (searchMode === 'category' || (!searchQuery.trim() && selectedCategory !== 'all')) {
        // Búsqueda por categoría
        response = await searchByCategory(
          selectedCategory,
          page,
          productsPerPage,
          sortBy,
          sortOrder
        );
        setSearchResults(response.data || []);
        setPagination(response.pagination || null);
      } else {
        // Búsqueda por texto
        response = await searchProducts(searchQuery, page, productsPerPage);
        // La API de búsqueda devuelve una estructura diferente
        setSearchResults(response.data?.data || []);
        setPagination({
          page: response.data?.pagination?.currentPage || 1,
          limit: response.data?.pagination?.itemsPerPage || productsPerPage,
          total: response.data?.pagination?.totalItems || 0,
          totalPages: response.data?.pagination?.totalPages || 1,
          hasNext: response.data?.pagination?.hasNextPage || false,
          hasPrev: response.data?.pagination?.hasPrevPage || false
        });
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
    const value = e.target.value;
    setQuery(value);
    setSearchMode('all');
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    setSearchMode('all');
    // Ejecutar búsqueda inmediatamente
    handleSearch(suggestion, 1, true);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSearchMode('category');
    setQuery('');
    handleSearch('', 1, true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setShowSuggestions(false);
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handlePageChange = (newPage) => {
    handleSearch(searchMode === 'category' ? '' : query, newPage, false);
    // Scroll suave hacia arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCategoryDisplayName = (category) => {
    if (category === 'all') return 'Todas las categorías';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <div className="unified-search">
      {/* Barra de búsqueda principal */}
      <div className="box mb-5">
        <div className="field">
          <label className="label is-medium">
            <span className="icon-text">
              <span className="icon">
                <i className="fas fa-search"></i>
              </span>
              <span>Buscar Productos</span>
            </span>
          </label>
          
          <div className="field has-addons">
            <div className="control has-icons-left is-expanded" ref={suggestionsRef}>
              <input
                ref={searchInputRef}
                className="input is-large"
                type="text"
                placeholder="Buscar por título, marca, SKU, descripción..."
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleKeyDown}
                disabled={loading}
                autoComplete="off"
              />
              <span className="icon is-left">
                <i className="fas fa-search"></i>
              </span>
              
              {/* Sugerencias mejoradas */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="dropdown is-active" style={{ 
                  width: '100%', 
                  position: 'absolute', 
                  zIndex: 1000,
                  top: '100%'
                }}>
                  <div className="dropdown-menu" style={{ width: '100%' }}>
                    <div className="dropdown-content">
                      <div className="dropdown-item">
                        <p className="has-text-grey is-size-7 mb-2">
                          <strong>Sugerencias de búsqueda:</strong>
                        </p>
                      </div>
                      {suggestions.map((suggestion, index) => (
                        <a
                          key={index}
                          className="dropdown-item is-size-6"
                          onClick={() => handleSuggestionClick(suggestion)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className="icon-text">
                            <span className="icon is-small has-text-primary">
                              <i className="fas fa-search"></i>
                            </span>
                            <span>{suggestion}</span>
                          </span>
                        </a>
                      ))}
                      <hr className="dropdown-divider" />
                      <div className="dropdown-item">
                        <p className="has-text-grey is-size-7">
                          Presiona Enter o haz clic en una sugerencia para buscar
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="control">
              <button
                className={`button is-primary is-large ${loading ? 'is-loading' : ''}`}
                onClick={() => handleSearch()}
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

        {/* Filtros y categorías */}
        <div className="columns is-vcentered mt-3">
          <div className="column is-half">
            <div className="field">
              <label className="label is-small">Explorar por categoría:</label>
              <div className="control">
                <div className="select is-fullwidth">
                  <select 
                    value={selectedCategory} 
                    onChange={(e) => handleCategoryChange(e.target.value)}
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
              <label className="label is-small">Ordenar por:</label>
              <div className="field has-addons">
                <div className="control">
                  <div className="select">
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                      <option value="title">Nombre</option>
                      <option value="price">Precio</option>
                      <option value="createdAt">Fecha</option>
                    </select>
                  </div>
                </div>
                <div className="control">
                  <div className="select">
                    <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                      <option value="asc">↑ Ascendente</option>
                      <option value="desc">↓ Descendente</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="column is-narrow">
            <div className="field">
              <label className="label is-small">Por página:</label>
              <div className="control">
                <div className="select">
                  <select 
                    value={productsPerPage} 
                    onChange={(e) => setProductsPerPage(parseInt(e.target.value))}
                  >
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de modo de búsqueda */}
      {(query || selectedCategory !== 'all') && (
        <div className="level mb-4">
          <div className="level-left">
            <div className="level-item">
              <div className="tags has-addons">
                <span className="tag is-primary">
                  {searchMode === 'category' ? 'Categoría' : 'Búsqueda'}
                </span>
                <span className="tag is-light">
                  {searchMode === 'category' 
                    ? getCategoryDisplayName(selectedCategory)
                    : query || 'Todos los productos'
                  }
                </span>
              </div>
            </div>
          </div>
          <div className="level-right">
            <div className="level-item">
              {pagination && (
                <span className="has-text-grey">
                  {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} productos
                </span>
              )}
            </div>
          </div>
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
          <p className="mt-2">Buscando productos...</p>
        </div>
      )}

      {/* Resultados de búsqueda */}
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
                      <div className="field is-grouped is-grouped-multiline mb-3">
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
                        <p className="has-text-weight-bold has-text-success">
                          <span className="icon">
                            <i className="fas fa-dollar-sign"></i>
                          </span>
                          ${product.price.toLocaleString()}
                        </p>
                      )}
                      
                      {product.description && (
                        <p className="is-size-7 has-text-grey mt-2">
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
                {[...Array(Math.min(pagination.totalPages, 7))].map((_, index) => {
                  const pageNumber = index + 1;
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
                })}
              </ul>
            </nav>
          )}
        </>
      )}

      {/* Mensaje cuando no hay resultados */}
      {!loading && searchResults.length === 0 && (query || selectedCategory !== 'all') && (
        <div className="has-text-centered p-6">
          <span className="icon is-large has-text-grey-light">
            <i className="fas fa-search fa-3x"></i>
          </span>
          <p className="title is-4 has-text-grey">No se encontraron productos</p>
          <p className="subtitle is-6 has-text-grey">
            {searchMode === 'category' 
              ? `No hay productos en la categoría "${getCategoryDisplayName(selectedCategory)}"`
              : `No se encontraron resultados para "${query}"`
            }
          </p>
          <button 
            className="button is-primary is-outlined"
            onClick={() => {
              setQuery('');
              setSelectedCategory('all');
              setSearchResults([]);
              setPagination(null);
              searchInputRef.current?.focus();
            }}
          >
            Limpiar búsqueda
          </button>
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
            Usa el buscador o selecciona una categoría para explorar nuestro catálogo
          </p>
          <div className="buttons is-centered mt-4">
            <button 
              className="button is-primary"
              onClick={() => searchInputRef.current?.focus()}
            >
              <span className="icon">
                <i className="fas fa-keyboard"></i>
              </span>
              <span>Comenzar búsqueda</span>
            </button>
            <button 
              className="button is-info is-outlined"
              onClick={() => setSelectedCategory(categories[1] || 'all')}
            >
              <span className="icon">
                <i className="fas fa-th-list"></i>
              </span>
              <span>Explorar categorías</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedSearch;