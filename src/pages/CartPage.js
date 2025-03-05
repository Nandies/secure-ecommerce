import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { secureApiClient, securityUtils } from '../utils/apiClient';
import { useAuth } from '../utils/auth';

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subtotal, setSubtotal] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // Fetch cart data securely
  useEffect(() => {
    const fetchCart = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await secureApiClient.get('/cart');
        
        // Validate cart data structure
        if (!response.data || !Array.isArray(response.data.items)) {
          throw new Error('Invalid cart data');
        }
        
        setCartItems(response.data.items);
        
        // Calculate subtotal with precision handling
        const calculatedSubtotal = response.data.items.reduce((total, item) => {
          return total + (item.price * item.quantity);
        }, 0);
        
        setSubtotal(parseFloat(calculatedSubtotal.toFixed(2)));
        setLoading(false);
      } catch (err) {
        console.error('Error fetching cart:', err);
        
        // Handle different error scenarios
        if (err.response?.status === 401) {
          setError('Please log in to view your cart');
        } else {
          setError('Failed to load cart. Please try again.');
        }
        
        setLoading(false);
      }
    };
    
    fetchCart();
  }, []);
  
  // Update cart item quantity
  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1 || newQuantity > 10) return; // Limit quantity for security
    if (isUpdating) return; // Prevent concurrent updates
    
    try {
      setIsUpdating(true);
      
      // Generate idempotency key for safe retries
      const idempotencyKey = `update-${itemId}-${Date.now()}`;
      
      await secureApiClient.put('/cart/update', {
        itemId,
        quantity: newQuantity,
        idempotencyKey
      });
      
      // Update local state after successful API call
      setCartItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
      
      // Recalculate subtotal
      setSubtotal(prevSubtotal => {
        const updatedItem = cartItems.find(item => item.id === itemId);
        if (!updatedItem) return prevSubtotal;
        
        const oldSubtotal = prevSubtotal - (updatedItem.price * updatedItem.quantity);
        const newSubtotal = oldSubtotal + (updatedItem.price * newQuantity);
        
        return parseFloat(newSubtotal.toFixed(2));
      });
    } catch (err) {
      console.error('Error updating cart:', err);
      alert('Failed to update cart. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Remove item from cart
  const removeItem = async (itemId) => {
    if (isUpdating) return; // Prevent concurrent operations
    
    try {
      setIsUpdating(true);
      
      await secureApiClient.delete(`/cart/items/${itemId}`);
      
      // Update local state after successful API call
      const removedItem = cartItems.find(item => item.id === itemId);
      
      setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
      
      // Update subtotal
      if (removedItem) {
        setSubtotal(prevSubtotal => {
          const newSubtotal = prevSubtotal - (removedItem.price * removedItem.quantity);
          return parseFloat(Math.max(0, newSubtotal).toFixed(2));
        });
      }
    } catch (err) {
      console.error('Error removing item:', err);
      alert('Failed to remove item. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handle checkout process
  const handleCheckout = () => {
    // Require authentication for checkout
    if (!isAuthenticated) {
      // Redirect to login with return URL
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    
    // Navigate to checkout page
    navigate('/checkout');
  };
  
  // Mock cart data for development
  const mockCartItems = [
    {
      id: '1',
      productId: '1',
      name: 'Premium Wireless Headphones',
      price: 129.99,
      quantity: 1,
      image: '/images/headphones.jpg'
    },
    {
      id: '2',
      productId: '2',
      name: 'Smartphone Case',
      price: 24.99,
      quantity: 2,
      image: '/images/case.jpg'
    }
  ];
  
  // Use mock data in development if needed
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && loading && cartItems.length === 0 && !error) {
      setTimeout(() => {
        setCartItems(mockCartItems);
        
        // Calculate subtotal
        const calculatedSubtotal = mockCartItems.reduce((total, item) => {
          return total + (item.price * item.quantity);
        }, 0);
        
        setSubtotal(parseFloat(calculatedSubtotal.toFixed(2)));
        setLoading(false);
      }, 1000);
    }
  }, [loading, cartItems, error]);
  
  // Format price helper
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };
  
  // Security nonce for checkout form
  const [csrfToken, setCsrfToken] = useState('');
  
  useEffect(() => {
    // Generate a CSRF token for checkout form
    setCsrfToken(securityUtils.generateNonce());
  }, []);
  
  return (
    <>
      <Helmet>
        <title>Your Cart - Secure E-Commerce</title>
        <meta name="description" content="Review and manage your shopping cart items" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="cart-page">
        <div className="container">
          <h1>Your Shopping Cart</h1>
          
          {loading ? (
            <div className="loading-spinner">
              <p>Loading your cart...</p>
            </div>
          ) : error ? (
            <div className="error-message">
              <p>{error}</p>
              <Link to="/products" className="btn btn-primary">
                Browse Products
              </Link>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="empty-cart">
              <h2>Your cart is empty</h2>
              <p>Looks like you haven't added any products to your cart yet.</p>
              <Link to="/products" className="btn btn-primary">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="cart-content">
              <div className="cart-items">
                <table className="cart-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Quantity</th>
                      <th>Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map(item => {
                      // Sanitize data for security
                      const sanitizedName = securityUtils.sanitizeOutput(item.name);
                      
                      return (
                        <tr key={item.id} className="cart-item">
                          <td className="item-info">
                            <img 
                              src={item.image || '/placeholder-product.jpg'} 
                              alt={sanitizedName}
                              className="item-image"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/placeholder-product.jpg';
                              }}
                            />
                            <div className="item-details">
                              <h3 className="item-name">
                                <Link to={`/products/${item.productId}`}>
                                  {sanitizedName}
                                </Link>
                              </h3>
                            </div>
                          </td>
                          <td className="item-price">
                            {formatPrice(item.price)}
                          </td>
                          <td className="item-quantity">
                            <div className="quantity-controls">
                              <button 
                                className="quantity-btn"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1 || isUpdating}
                              >
                                -
                              </button>
                              <span className="quantity-value">{item.quantity}</span>
                              <button 
                                className="quantity-btn"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={item.quantity >= 10 || isUpdating}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="item-total">
                            {formatPrice(item.price * item.quantity)}
                          </td>
                          <td className="item-actions">
                            <button 
                              className="remove-btn"
                              onClick={() => removeItem(item.id)}
                              disabled={isUpdating}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="cart-summary">
                <h2>Order Summary</h2>
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping:</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="summary-row">
                  <span>Tax:</span>
                  <span>Calculated at checkout</span>
                </div>
                <div className="summary-total">
                  <span>Estimated Total:</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                
                <form onSubmit={(e) => e.preventDefault()}>
                  {/* Hidden CSRF token for security */}
                  <input type="hidden" name="csrf_token" value={csrfToken} />
                  
                  <button 
                    type="button"
                    className="btn btn-primary checkout-btn"
                    onClick={handleCheckout}
                    disabled={isUpdating}
                  >
                    Proceed to Checkout
                  </button>
                </form>
                
                <div className="continue-shopping">
                  <Link to="/products">Continue Shopping</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CartPage;