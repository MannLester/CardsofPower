import React, { createContext, useContext, useState, useEffect } from 'react';

// Create User Context
const UserContext = createContext();

// Custom hook to use user context
export const useUser = () => useContext(UserContext);

// UserProvider component to provide user context
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Check if user data exists in localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser)); // Parse the JSON string back to an object
    }
  }, []);

  // Whenever the user data changes, update localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user)); // Store user data in localStorage
    } else {
      localStorage.removeItem('user'); // Remove user data from localStorage when logged out
    }
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
