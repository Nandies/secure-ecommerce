import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { secureApiClient, securityUtils } from '../utils/apiClient';

const ProductDetailPage = () => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      // Input validation
      if (!id || !/^[a-zA-Z0-9-_]+$/.test(id)) {
        setError('Invalid product ID');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Request with timeout for security
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await secureApiClient.get(`/products/${id}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Validate response
        if (!response || !response.data) {
          throw new Error('Invalid response from server');
        }
        
        setProduct(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching product:', err);
        
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else if (err.response?.status === 404) {
          setError('Product not found');
        } else {
          setError('Failed to load product details');
        }
        
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [id]);
  
  // Handle quantity change
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (value > 0 && value <= 10) { // Limit max quantity for security
      setQuantity(value);
    }
  };
  
  // Add to cart handler with security measures
  const handleAddToCart = async () => {
    try {
      if (!product || !product.id) return;
      
      // Generate request ID for idempotency
      const requestId = `add-${product.id}-${Date.now()}`;
      
      await secureApiClient.post('/cart/add', {
        productId: product.id,
        quantity,
        requestId
      });
      
      // Navigate to cart page after successful addition
      navigate('/cart');
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add product to cart. Please try again.');
    }
  };
  
  // Mock product for development without backend
  const mockProduct = {
    id: '1',
    name: 'Premium Wireless Headphones',
    price: 129.99,
    description: 'High-quality wireless headphones with noise cancellation. Features include 30-hour battery life, comfortable over-ear design, and premium sound quality.',
    images: ['/images/headphones-1.jpg', '/images/headphones-2.jpg', '/images/headphones-3.jpg'],
    rating: 4.5,
    reviewCount: 128,
    inStock: true,
    features: [
      'Active noise cancellation',
      '30-hour battery life',
      'Premium sound quality',
      'Comfortable over-ear design',
      'Quick charge capability'
    ],
    specifications: {
      brand: 'AudioTech',
      model: 'AT-500',
      connectivity: 'Bluetooth 5.0',
      batteryLife: '30 hours',
      weight: '250g'
    }
  };
  
  // Use mock product if in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && loading && !product && !error) {
      setTimeout(() => {
        setProduct(mockProduct);
        setLoading(false);
      }, 1000);
    }
  }, [loading, product, error]);
  
  // Show loading state
  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <div className="loading-spinner">
            <p>Loading product details...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="product-detail-page">
        <div className="container">
          <div className="error-message">
            <h2>Error</h2>
            <p>{error}</p>
            <button 
              onClick={() => navigate('/products')}
              className="btn btn-primary"
            >
              Back to Products
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // If product exists, show the details
  if (product) {
    // Sanitize content for security
    const sanitizedName = securityUtils.sanitizeOutput(product.name);
    const sanitizedDescription = securityUtils.sanitizeOutput(product.description);
    
    // Format price
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(product.price);
    
    return (
      <>
        <Helmet>
          <title>{`${sanitizedName} - Secure E-Commerce`}</title>
          <meta name="description" content={sanitizedDescription.substring(0, 160)} />
        </Helmet>
        
        <div className="product-detail-page">
          <div className="container">
            <div className="product-detail-container">
              <div className="product-images">
                <div className="main-image">
                  <img 
                    src={product.images?.[0] || '/placeholder-product.jpg'} 
                    alt={sanitizedName}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder-product.jpg';
                    }}
                  />
                </div>
                
                {product.images && product.images.length > 1 && (
                  <div className="thumbnail-images">
                    {product.images.map((image, index) => (
                      <img 
                        key={index}
                        src={image}
                        alt={`${sanitizedName} - View ${index + 1}`}
                        className="thumbnail"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/placeholder-product.jpg';
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              <div className="product-info">
                <h1 className="product-title">{sanitizedName}</h1>
                
                <div className="product-rating">
                  <span className="stars">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} className={`star ${i < Math.floor(product.rating) ? 'filled' : ''}`}>
                        {i < Math.floor(product.rating) ? '★' : '☆'}
                      </span>
                    ))}
                  </span>
                  <span className="rating-text">
                    {product.rating.toFixed(1)} ({product.reviewCount} reviews)
                  </span>
                </div>
                
                <div className="product-price">{formattedPrice}</div>
                
                <div className="product-description">
                  <p>{sanitizedDescription}</p>
                </div>
                
                {product.features && product.features.length > 0 && (
                  <div className="product-features">
                    <h3>Key Features</h3>
                    <ul>
                      {product.features.map((feature, index) => (
                        <li key={index}>{securityUtils.sanitizeOutput(feature)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {product.inStock ? (
                  <div className="product-purchase">
                    <div className="quantity-selector">
                      <label htmlFor="quantity">Quantity:</label>
                      <input
                        type="number"
                        id="quantity"
                        min="1"
                        max="10"
                        value={quantity}
                        onChange={handleQuantityChange}
                      />
                    </div>
                    
                    <button 
                      className="btn btn-primary add-to-cart-btn"
                      onClick={handleAddToCart}
                    >
                      Add to Cart
                    </button>
                  </div>
                ) : (
                  <div className="out-of-stock-message">
                    <p>This product is currently out of stock.</p>
                    <button className="btn btn-secondary notify-btn">
                      Notify Me When Available
                    </button>
                  </div>
                )}
                
                {product.specifications && (
                  <div className="product-specs">
                    <h3>Specifications</h3>
                    <table className="specs-table">
                      <tbody>
                        {Object.entries(product.specifications).map(([key, value]) => (
                          <tr key={key}>
                            <th>{key.charAt(0).toUpperCase() + key.slice(1)}</th>
                            <td>{securityUtils.sanitizeOutput(value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  return null;
};

export default ProductDetailPage;