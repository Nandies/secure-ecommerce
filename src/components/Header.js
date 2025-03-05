import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/auth';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    navigate('/');
  };
  
  return (
    <header className="site-header">
      <div className="container">
        <div className="logo">
          <Link to="/">Secure E-Commerce</Link>
        </div>
        
        <nav className="main-nav">
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/products">Products</Link></li>
            <li><Link to="/cart">Cart</Link></li>
            {isAuthenticated ? (
              <>
                <li><span>Welcome, {user.name}</span></li>
                <li><button onClick={handleLogout}>Logout</button></li>
              </>
            ) : (
              <>
                <li><Link to="/login">Login</Link></li>
                <li><Link to="/register">Register</Link></li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;