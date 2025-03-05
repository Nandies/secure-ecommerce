import React from 'react';
import { Link } from 'react-router-dom';
import { securityUtils } from '../utils/apiClient';

const ProductCard = ({ product }) => {
  // Destructure product properties with defaults for security
  const {
    id = '',
    name = '',
    price = 0,
    description = '',
    image = '',
    rating = 0,
    inStock = false
  } = product || {};
  
  // Sanitize text content to prevent XSS
  const sanitizedName = securityUtils.sanitizeOutput(name);
  const sanitizedDescription = securityUtils.sanitizeOutput(description);
  
  // Format price correctly
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
  
  // Generate star rating display
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={`star-${i}`} className="star full">★</span>);
    }
    
    // Add half star if needed
    if (hasHalfStar) {
      stars.push(<span key="star-half" className="star half">★</span>);
    }
    
    // Add empty stars
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`star-empty-${i}`} className="star empty">☆</span>);
    }
    
    return stars;
  };
  
  return (
    <div className="product-card">
      <div className="product-image">
        {/* Use image placeholder if no image is provided */}
        <img 
          src={image || '/placeholder-product.jpg'} 
          alt={sanitizedName}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/placeholder-product.jpg';
          }}
        />
        
        {/* Show badge if product is out of stock */}
        {!inStock && <span className="out-of-stock-badge">Out of Stock</span>}
      </div>
      
      <div className="product-details">
        {/* Link to product detail page with product ID */}
        <h3 className="product-title">
          <Link to={`/products/${id}`}>{sanitizedName}</Link>
        </h3>
        
        <div className="product-rating">
          {renderStars(rating)}
          <span className="rating-number">({rating.toFixed(1)})</span>
        </div>
        
        <div className="product-price">{formattedPrice}</div>
        
        <p className="product-description">
          {sanitizedDescription.length > 100
            ? `${sanitizedDescription.substring(0, 100)}...`
            : sanitizedDescription}
        </p>
        
        <div className="product-actions">
          <Link 
            to={`/products/${id}`} 
            className="btn btn-outline-primary"
          >
            View Details
          </Link>
          
          <button 
            className="btn btn-primary add-to-cart" 
            disabled={!inStock}
            onClick={(e) => {
              e.preventDefault();
              // Add to cart logic would go here
              console.log(`Added product ${id} to cart`);
            }}
          >
            {inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;