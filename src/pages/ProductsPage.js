import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { secureApiClient } from '../utils/apiClient';
import ProductCard from '../components/ProductCard';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'popularity'
  });
  
  // Fetch products with security measures
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Build query parameters from filters
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.minPrice) params.append('minPrice', filters.minPrice);
        if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        
        // Make secure API request
        const response = await secureApiClient.get(`/products?${params.toString()}`);
        
        // Validate response structure before setting state
        const productsData = response.data && Array.isArray(response.data.products) 
          ? response.data.products 
          : [];
          
        // Set products to state with timeout for smooth UX
        setTimeout(() => {
          setProducts(productsData);
          setLoading(false);
        }, 300);
      } catch (err) {
        console.error('Error fetching products:', err);
        
        // Set appropriate error message
        if (err.response?.status === 429) {
          setError('Too many requests. Please try again later.');
        } else {
          setError('Failed to load products. Please try again.');
        }
        
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [filters]);
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value
    }));
  };
  
  // For demo purposes only, if we don't have a backend yet
  const mockProducts = [
    {
      id: '1',
      name: 'Premium Wireless Headphones',
      price: 129.99,
      description: 'High-quality wireless headphones with noise cancellation.',
      image: '/images/headphones.jpg',
      rating: 4.5,
      inStock: true
    },
    {
      id: '2',
      name: 'Smartphone Case',
      price: 24.99,
      description: 'Durable smartphone case with drop protection.',
      image: '/images/case.jpg',
      rating: 4.2,
      inStock: true
    },
    {
      id: '3',
      name: 'Smart Watch',
      price: 199.99,
      description: 'Feature-rich smartwatch with fitness tracking.',
      image: '/images/watch.jpg',
      rating: 4.8,
      inStock: false
    },
    {
      id: '4',
      name: 'Bluetooth Speaker',
      price: 79.99,
      description: 'Portable Bluetooth speaker with excellent sound quality.',
      image: '/images/speaker.jpg',
      rating: 4.0,
      inStock: true
    }
  ];
  
  // If we don't have actual products yet, use mock data
  useEffect(() => {
    if (loading && products.length === 0 && !error) {
      setTimeout(() => {
        setProducts(mockProducts);
        setLoading(false);
      }, 1000);
    }
  }, []);
  
  return (
    <>
      <Helmet>
        <title>Products - Secure E-Commerce</title>
        <meta name="description" content="Browse our secure selection of products" />
      </Helmet>
      
      <div className="products-page">
        <div className="container">
          <h1>Products</h1>
          
          <div className="filters-section">
            <h2>Filters</h2>
            <div className="filters-form">
              <div className="filter-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                >
                  <option value="">All Categories</option>
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="home">Home & Kitchen</option>
                  <option value="books">Books</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label htmlFor="minPrice">Min Price</label>
                <input
                  type="number"
                  id="minPrice"
                  name="minPrice"
                  value={filters.minPrice}
                  onChange={handleFilterChange}
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="filter-group">
                <label htmlFor="maxPrice">Max Price</label>
                <input
                  type="number"
                  id="maxPrice"
                  name="maxPrice"
                  value={filters.maxPrice}
                  onChange={handleFilterChange}
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="filter-group">
                <label htmlFor="sortBy">Sort By</label>
                <select
                  id="sortBy"
                  name="sortBy"
                  value={filters.sortBy}
                  onChange={handleFilterChange}
                >
                  <option value="popularity">Popularity</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Display products */}
          <div className="products-section">
            {loading ? (
              <div className="loading-spinner">
                <p>Loading products...</p>
              </div>
            ) : error ? (
              <div className="error-message">
                <p>{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="btn btn-primary"
                >
                  Try Again
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="no-products">
                <p>No products found matching your criteria.</p>
              </div>
            ) : (
              <div className="products-grid">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductsPage;