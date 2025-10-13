import React, { useState, useEffect } from 'react';
import 'bulma/css/bulma.min.css';
import './App.css';
import SearchForm from './components/SearchForm';
import ProductList from './components/ProductList';
import LoadData from './components/LoadData';
import SystemStats from './components/SystemStats';
import { searchProducts, getSystemHealth, getSuggestions } from './services/api';

function App() {
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [activeTab, setActiveTab] = useState('search');

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    try {
      const health = await getSystemHealth();
      setSystemHealth(health);
    } catch (error) {
      console.error('Error checking system health:', error);
    }
  };

  const handleSearch = async (query, page = 1, limit = 20) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await searchProducts(query, page, limit);
      setSearchResults(results);
    } catch (error) {
      setError('Error al realizar la búsqueda: ' + error.message);
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestions = async (query) => {
    try {
      const suggestions = await getSuggestions(query);
      return suggestions.data?.suggestions || [];
    } catch (error) {
      console.error('Suggestions error:', error);
      return [];
    }
  };

  return (
    <div className="app-container">
      <section className="hero is-primary">
        <div className="hero-body">
          <div className="container">
            <div className="level">
              <div className="level-left">
                <div className="level-item">
                  <div>
                    <h1 className="title is-3">
                      <span className="icon is-large mr-3">
                        <i className="fas fa-search fa-lg"></i>
                      </span>
                      DataCorp Solutions
                    </h1>
                    <h2 className="subtitle is-5">Sistema de Indexación y Búsqueda de Productos</h2>
                  </div>
                </div>
              </div>
              <div className="level-right">
                <div className="level-item">
                  <span className="tag is-light is-medium">
                    <span className="icon">
                      <i className="fas fa-database"></i>
                    </span>
                    <span>MongoDB + Redis</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {systemHealth && (
        <section className="section py-4">
          <div className="container">
            <div className="notification is-light">
              <div className="level is-mobile">
                <div className="level-left">
                  <div className="level-item">
                    <span className="icon">
                      <i className={`fas fa-circle ${systemHealth.status === 'healthy' ? 'has-text-success' : 'has-text-danger'}`}></i>
                    </span>
                    <span className="ml-2">
                      <strong>Estado del Sistema:</strong> {systemHealth.status === 'healthy' ? 'Operativo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
                <div className="level-right">
                  <div className="level-item">
                    <span className="tag is-info is-medium">
                      <span className="icon">
                        <i className="fas fa-database"></i>
                      </span>
                      <span>{systemHealth.services?.products?.totalCount || 0} productos</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="section py-4">
        <div className="container">
          <div className="tabs is-boxed is-centered">
            <ul>
              <li className={activeTab === 'search' ? 'is-active' : ''}>
                <a onClick={() => setActiveTab('search')}>
                  <span className="icon is-small">
                    <i className="fas fa-search"></i>
                  </span>
                  <span>Buscar Productos</span>
                </a>
              </li>
              <li className={activeTab === 'load' ? 'is-active' : ''}>
                <a onClick={() => setActiveTab('load')}>
                  <span className="icon is-small">
                    <i className="fas fa-upload"></i>
                  </span>
                  <span>Cargar Datos</span>
                </a>
              </li>
              <li className={activeTab === 'stats' ? 'is-active' : ''}>
                <a onClick={() => setActiveTab('stats')}>
                  <span className="icon is-small">
                    <i className="fas fa-chart-bar"></i>
                  </span>
                  <span>Estadísticas</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <div className="main-content">
        <section className="section">
          <div className="container">
            {activeTab === 'search' && (
              <div className="content">
                <SearchForm 
                  onSearch={handleSearch}
                  onSuggestions={handleSuggestions}
                  loading={loading}
                />
                
                {error && (
                  <div className="notification is-danger mt-4">
                    <button className="delete" onClick={() => setError(null)}></button>
                    {error}
                  </div>
                )}

                {searchResults && (
                  <ProductList 
                    results={searchResults}
                    onPageChange={(page) => handleSearch(searchResults.meta?.query, page)}
                    loading={loading}
                  />
                )}
              </div>
            )}

            {activeTab === 'load' && (
              <LoadData onLoadComplete={checkSystemHealth} />
            )}

            {activeTab === 'stats' && (
              <SystemStats />
            )}
          </div>
        </section>
      </div>

      <footer className="footer">
        <div className="content has-text-centered">
          <p>
            <strong>DataCorp Solutions</strong> - Sistema de Indexación y Búsqueda de Productos
          </p>
          <p>
            Desarrollado con 
            <span className="icon has-text-danger">
              <i className="fas fa-heart"></i>
            </span>
            para el manejo de grandes volúmenes de datos
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
