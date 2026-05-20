import React, { createContext, useState, useEffect } from 'react';
import webSocketService from '../api/webSocketService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      // Connect to WebSocket
      webSocketService.connect(userData.id, token);
    }
  }, []);

  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData.token);
    setUser(userData);
    // Connect to WebSocket
    webSocketService.connect(userData.id, userData.token);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    // Disconnect WebSocket
    webSocketService.disconnect();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
