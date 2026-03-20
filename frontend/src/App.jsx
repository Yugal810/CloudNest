import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup'; // <--- Make sure this import is here!
import Dashboard from './pages/Dashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  // Listen for changes in localStorage to sync login state
  useEffect(() => {
    const checkAuth = () => setIsAuthenticated(!!localStorage.getItem('token'));
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const login = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <Routes>
        {/* Signup Route */}
        <Route path="/signup" element={<Signup />} />

        {/* Login Route */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login onLogin={login} /> : <Navigate to="/dashboard" />} 
        />

        {/* Protected Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard logout={logout} /> : <Navigate to="/login" />} 
        />

        {/* Default Redirect */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;