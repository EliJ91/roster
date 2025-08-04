import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on app start
  useEffect(() => {
    const savedUser = localStorage.getItem('roster-user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error loading saved user:', error);
        localStorage.removeItem('roster-user');
      }
    }
    setLoading(false);
  }, []);

  // Login user and save to localStorage
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('roster-user', JSON.stringify(userData));
  };

  // Logout user and clear localStorage
  const logout = () => {
    setUser(null);
    localStorage.removeItem('roster-user');
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isLoggedIn: !!user
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
