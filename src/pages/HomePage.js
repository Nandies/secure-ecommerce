import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const HomePage = () => {
  return (
    <>
      <Helmet>
        <title>Secure E-Commerce - Home</title>
        <meta name="description" content="Welcome to our secure e-commerce platform." />
      </Helmet>
      
      <div className="home-page">
        <section className="hero">
          <div className="container">
            <h1>Welcome to Secure E-Commerce</h1>
            <p>Your trusted destination for secure online shopping</p>
            <div className="hero-buttons">
              <Link to="/products" className="btn btn-primary">Shop Now</Link>
            </div>
          </div>
        </section>
        
        <section className="features">
          <div className="container">
            <h2>Why Choose Us?</h2>
            <div className="features-grid">
              <div className="feature-item">
                <h3>Secure Payments</h3>
                <p>All transactions are encrypted and protected with the latest security protocols.</p>
              </div>
              
              <div className="feature-item">
                <h3>Data Protection</h3>
                <p>Your personal information is safe with our robust data protection measures.</p>
              </div>
              
              <div className="feature-item">
                <h3>Quality Products</h3>
                <p>We ensure all products meet high-quality standards before listing.</p>
              </div>
              
              <div className="feature-item">
                <h3>Fast Delivery</h3>
                <p>Get your orders delivered quickly and securely to your doorstep.</p>
              </div>
            </div>
          </div>
        </section>
        
        <section className="featured-products">
          <div className="container">
            <h2>Featured Products</h2>
            <div className="products-grid">
              {/* This would be populated dynamically from API */}
              <p>Loading featured products...</p>
            </div>
            <div className="text-center">
              <Link to="/products" className="btn btn-primary">View All Products</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default HomePage;