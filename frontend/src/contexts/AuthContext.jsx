import React, { createContext, useContext, useState, useEffect } from 'react';
import { getToken, removeToken, setToken as saveToken } from '../utils/auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = getToken();
    if (storedToken) {
      verifyToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (tokenToVerify) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`,
          'Content-Type': 'application/json',
        },
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Server returned HTML (likely 404 or 500 error page)
        throw new Error('Server returned invalid response');
      }

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);
        setToken(tokenToVerify);
        saveToken(tokenToVerify);
      } else {
        // Token invalid, remove it
        removeToken();
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      removeToken();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error(`Server error: ${response.status} ${response.statusText}. Please check if the backend server is running.`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Login failed');
      }

      if (data.success && data.token) {
        setUser(data.user);
        setToken(data.token);
        saveToken(data.token);
        return { success: true, user: data.user, token: data.token };
      }

      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (email, password, name, role) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim(), 
          password, 
          name: name.trim(), 
          role: role || 'employee' 
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error(`Server error: ${response.status} ${response.statusText}. Please check if the backend server is running.`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Signup failed');
      }

      if (data.success && data.token) {
        setUser(data.user);
        setToken(data.token);
        saveToken(data.token);
        return { success: true, user: data.user, token: data.token };
      }

      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = () => {
    removeToken();
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
