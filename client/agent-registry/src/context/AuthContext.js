// src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for user data
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    const authUser = {
      ...userData,
      token,
      tokenExpiry: Date.now() + 3600000, // 1 hour expiry
    };
    setUser(authUser);
    localStorage.setItem('user', JSON.stringify(authUser));
    return authUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const getToken = () => {
    if (!user) return null;
    
    // Check if token is expired
    if (user.tokenExpiry && user.tokenExpiry < Date.now()) {
      logout();
      return null;
    }
    
    return user.token;
  };

  const isAuthenticated = () => {
    return !!getToken();
  };

  const hasRole = (requiredRole) => {
    if (!user) return false;
    return user.role === requiredRole;
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        logout, 
        getToken, 
        isAuthenticated, 
        hasRole,
        loading 
      }}>
      {children}
    </AuthContext.Provider>
  );
};