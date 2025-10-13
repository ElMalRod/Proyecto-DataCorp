import React from 'react';

const ProductList = ({ results, onPageChange, loading }) => {
  if (!results || !results.data) {
    return null;
  }

  const { data, meta } = results;
  const { products, totalCount, page, limit, totalPages, searchTime, fromCache } = data;

  if (products.length === 0) {
    return (
      <div className="box mt-5">
        <div className="has-text-centered py-6">
          <span className="icon is-large has-text-grey-light">
            <i className="fas fa-search fa-3x"></i>
          </span>
          <p className="title is-5 has-text-grey">No se encontraron productos</p>
          <p className="subtitle is-6 has-text-grey">
            Intenta con otros términos de búsqueda
          </p>
        </div>
      </div>
    );
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && !loading) {
      onPageChange(newPage);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(price || 0);
  };

  return (
    <div className="mt-5">
      {/* Información de resultados */}
      <div className="level mb-5">
        <div className="level-left">
          <div className="level-item">
            <div className="content">
              <p>
                <strong>{totalCount.toLocaleString()}</strong> productos encontrados
                {meta.query && (
                  <span className="has-text-grey"> para "<em>{meta.query}</em>"</span>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="level-right">
          <div className="level-item">
            <div className="tags has-addons">
              <span className="tag is-light">
                <span className="icon">
                  <i className="fas fa-clock"></i>
                </span>
                <span>{searchTime}ms</span>
              </span>
              {fromCache && (
                <span className="tag is-success">
                  <span className="icon">
                    <i className="fas fa-bolt"></i>
                  </span>
                  <span>Cache</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lista de productos responsiva */}
      <div className="columns is-multiline">
        {products.map((product, index) => (
          <div key={product._id || index} className="column is-12-mobile is-6-tablet is-4-desktop is-3-widescreen">
            <div className="card product-card h-100">
              <div className="card-content">
                <div className="media">
                  <div className="media-left">
                    <span className="icon is-large has-text-primary">
                      <i className="fas fa-cube fa-2x"></i>
                    </span>
                  </div>
                  <div className="media-content">
                    <p className="title is-6 mb-2">{product.title}</p>
                    <p className="subtitle is-7 has-text-grey">{product.sku}</p>
                  </div>
                </div>

                <div className="content">
                  <div className="field">
                    <span className="tag is-info is-light">
                      <span className="icon">
                        <i className="fas fa-tag"></i>
                      </span>
                      <span>{product.category}</span>
                    </span>
                  </div>

                  {product.brand && (
                    <div className="field">
                      <span className="tag is-primary is-light">
                        <span className="icon">
                          <i className="fas fa-industry"></i>
                        </span>
                        <span>{product.brand}</span>
                      </span>
                    </div>
                  )}

                  {product.price && (
                    <div className="field">
                      <p className="title is-5 has-text-success">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                  )}

                  {product.product_type && (
                    <div className="field">
                      <span className="tag is-light">
                        <span className="icon">
                          <i className="fas fa-cog"></i>
                        </span>
                        <span>{product.product_type}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Paginación responsiva */}
      {totalPages > 1 && (
        <nav className="pagination is-centered mt-6" role="navigation">
          <button 
            className={`pagination-previous ${page <= 1 || loading ? 'is-disabled' : ''}`}
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || loading}
          >
            Anterior
          </button>
          <button 
            className={`pagination-next ${page >= totalPages || loading ? 'is-disabled' : ''}`}
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Siguiente
          </button>
          <ul className="pagination-list">
            {[...Array(Math.min(7, totalPages))].map((_, i) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }

              return (
                <li key={pageNum}>
                  <button
                    className={`pagination-link ${page === pageNum ? 'is-current' : ''} ${loading ? 'is-disabled' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={loading}
                  >
                    {pageNum}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* Información de página */}
      <div className="has-text-centered mt-4">
        <p className="is-size-7 has-text-grey">
          Página {page} de {totalPages} - 
          Mostrando {Math.min(limit, products.length)} de {totalCount.toLocaleString()} productos
        </p>
      </div>
    </div>
  );
};

export default ProductList;