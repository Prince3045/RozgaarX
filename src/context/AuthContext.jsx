import React, { createContext, useState, useEffect } from 'react';
import webSocketService from '../api/webSocketService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      // Connect to WebSocket safely
      try {
        webSocketService.connect(userData.id, token);
      } catch (err) {
        console.error("Failed to connect to WebSocket on load:", err);
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData.token);
    setUser(userData);
    // Connect to WebSocket safely
    try {
      webSocketService.connect(userData.id, userData.token);
    } catch (err) {
      console.error("Failed to connect to WebSocket on login:", err);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    // Disconnect WebSocket
    webSocketService.disconnect();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
