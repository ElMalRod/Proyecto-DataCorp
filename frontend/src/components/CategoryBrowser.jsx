import React, { useState, useEffect } from 'react';
import { getCategories, searchByCategory, getCategoryStats } from '../services/api';

const CategoryBrowser = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categoryStats, setCategoryStats] = useState([]);
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    loadCategories();
    loadCategoryStats();
  }, []);

  useEffect(() => {
    searchProducts(1);
  }, [selectedCategory, sortBy, sortOrder]);

  const loadCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(['all', ...response.data]);
    } catch (error) {
      console.error('Error cargando categorías:', error);
      setError('Error cargando categorías');
    }
  };

  const loadCategoryStats = async () => {
    try {
      const response = await getCategoryStats();
      setCategoryStats(response.data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const searchProducts = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const response = await searchByCategory(selectedCategory, page, 10, sortBy, sortOrder);
      setProducts(response.data);
      setPagination(response.pagination);
    } catch (error) {
      setError('Error al buscar productos: ' + error.message);
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  const handlePageChange = (newPage) => {
    searchProducts(newPage);
  };

  const getCategoryDisplayName = (category) => {
    if (category === 'all') return 'Todas las categorías';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getCategoryCount = (category) => {
    const stat = categoryStats.find(s => s.category === category);
    return stat ? stat.count : 0;
  };

  return (
    <div className="category-browser">
      {/* Header con controles */}
      <div className="level is-mobile mb-4">
        <div className="level-left">
          <div className="level-item">
            <h2 className="title is-4">Explorar por Categorías</h2>
          </div>
        </div>
        <div className="level-right">
          <div className="level-item">
            <button 
              className={`button is-small ${showStats ? 'is-primary' : ''}`}
              onClick={() => setShowStats(!showStats)}
            >
              <span className="icon">
                <i className="fas fa-chart-bar"></i>
              </span>
              <span>Estadísticas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas de categorías */}
      {showStats && (
        <div className="box mb-4">
          <h3 className="title is-5">Productos por Categoría</h3>
          <div className="columns is-multiline">
            {categoryStats.slice(0, 8).map((stat, index) => (
              <div key={index} className="column is-3">
                <div className="has-text-centered">
                  <p className="heading">{stat.category}</p>
                  <p className="title is-4">{stat.count.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="columns">
        {/* Sidebar de categorías */}
        <div className="column is-3">
          <div className="box">
            <h3 className="title is-5">Categorías</h3>
            
            {/* Controles de ordenamiento */}
            <div className="field">
              <label className="label is-small">Ordenar por:</label>
              <div className="control">
                <div className="select is-small is-fullwidth">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="title">Nombre</option>
                    <option value="price">Precio</option>
                    <option value="createdAt">Fecha</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="field">
              <label className="label is-small">Orden:</label>
              <div className="control">
                <div className="select is-small is-fullwidth">
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                    <option value="asc">Ascendente</option>
                    <option value="desc">Descendente</option>
                  </select>
                </div>
              </div>
            </div>

            <hr />

            {/* Lista de categorías */}
            <div className="menu">
              <ul className="menu-list">
                {categories.map((category, index) => (
                  <li key={index}>
                    <a
                      className={selectedCategory === category ? 'is-active' : ''}
                      onClick={() => handleCategoryChange(category)}
                    >
                      <span className="is-flex is-justify-content-space-between">
                        <span>{getCategoryDisplayName(category)}</span>
                        {category !== 'all' && (
                          <span className="tag is-small">
                            {getCategoryCount(category).toLocaleString()}
                          </span>
                        )}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Área principal de productos */}
        <div className="column is-9">
          {error && (
            <div className="notification is-danger">
              <button className="delete" onClick={() => setError(null)}></button>
              {error}
            </div>
          )}

          {loading && (
            <div className="has-text-centered p-6">
              <button className="button is-loading is-large is-white"></button>
              <p className="mt-2">Cargando productos...</p>
            </div>
          )}

          {pagination && (
            <div className="level is-mobile mb-4">
              <div className="level-left">
                <div className="level-item">
                  <p className="subtitle is-6">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} productos
                  </p>
                </div>
              </div>
              <div className="level-right">
                <div className="level-item">
                  <p className="is-size-7 has-text-grey">
                    Categoría: <strong>{getCategoryDisplayName(selectedCategory)}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Grid de productos */}
          {products.length > 0 && (
            <div className="columns is-multiline">
              {products.map((product, index) => (
                <div key={index} className="column is-6-desktop is-12-tablet">
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
                        <p><strong>Tipo:</strong> {product.product_type}</p>
                        <p><strong>SKU:</strong> {product.sku}</p>
                        {product.price && (
                          <p><strong>Precio:</strong> ${product.price.toLocaleString()}</p>
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
          )}

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

          {/* Mensaje cuando no hay productos */}
          {!loading && products.length === 0 && (
            <div className="has-text-centered p-6">
              <span className="icon is-large has-text-grey-light">
                <i className="fas fa-inbox fa-3x"></i>
              </span>
              <p className="title is-4 has-text-grey">No hay productos</p>
              <p className="subtitle is-6 has-text-grey">
                No se encontraron productos en la categoría "{getCategoryDisplayName(selectedCategory)}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryBrowser;