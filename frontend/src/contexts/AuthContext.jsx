import React, { createContext, useContext, useState, useEffect } from 'react';
import { getToken, removeToken, setToken as saveToken } from '../utils/auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Check for OAuth one-time code or existing stored token on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthCode = params.get('code');
    const storedToken = getToken();

    if (oauthCode) {
      // OAuth callback: exchange the short-lived code for a JWT.
      // Clean the URL immediately so the code never sits in browser history.
      window.history.replaceState({}, '', window.location.pathname);
      console.log('[AuthContext] OAuth code found in URL, exchanging for token...');
      fetch(`${API_BASE}/api/auth/exchange?code=${encodeURIComponent(oauthCode)}`)
        .then((r) => r.json())
        .then(({ token }) => {
          if (token) {
            verifyToken(token, true /* isNewLogin */);
          } else {
            console.error('[AuthContext] Code exchange returned no token');
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error('[AuthContext] Code exchange failed:', err);
          setLoading(false);
        });
      return;
    }

    // Normal page load: verify stored token (session refresh)
    if (storedToken) {
      verifyToken(storedToken, false);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (tokenToVerify, isNewLogin = false) => {
    console.log('[AuthContext] Verifying token...');
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

        // Immediate Resume Optimization (Refresh support)
        if (data.monitoringExpected) {
          console.log('[AuthContext] Verify indicates monitoring expected. Storing flag.');
          localStorage.setItem('monitoring_resume_expected', 'true');
          // If it's a new login (via URL/OAuth), treat it as 'login'. 
          // If it's just verification of stored token (refresh), treat as 'refresh'.
          localStorage.setItem('monitoring_trigger_type', isNewLogin ? 'login' : 'refresh');
          if (data.activeRequest) {
            localStorage.setItem('monitoring_resume_data', JSON.stringify(data.activeRequest));
          }
        }
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
        const error = new Error(data.message || data.error || 'Login failed');
        // If rate limited, extract when the user can retry
        if (response.status === 429) {
          const resetHeader = response.headers.get('RateLimit-Reset');
          // RateLimit-Reset is a Unix timestamp (seconds). Convert to ms.
          error.retryAfter = resetHeader ? parseInt(resetHeader, 10) * 1000 : Date.now() + 15 * 60 * 1000;
          error.isRateLimited = true;
        }
        // If invalid credentials, pass remaining attempts for the warning UI
        if (response.status === 401 && data.attemptsLeft !== undefined) {
          error.attemptsLeft = data.attemptsLeft;
        }
        throw error;
      }

      if (data.success && data.token) {
        setUser(data.user);
        setToken(data.token);
        saveToken(data.token);

        // Immediate Resume Optimization
        if (data.monitoringExpected) {
          console.log('[AuthContext] Login indicates monitoring expected. Storing flag.');
          localStorage.setItem('monitoring_resume_expected', 'true');
          localStorage.setItem('monitoring_trigger_type', 'login');
          if (data.activeRequest) {
            localStorage.setItem('monitoring_resume_data', JSON.stringify(data.activeRequest));
          }
        }

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

  const loginWithToken = async (tokenToUse, userData) => {
    setUser(userData);
    setToken(tokenToUse);
    saveToken(tokenToUse);
    return { success: true, user: userData, token: tokenToUse };
  };

  const logout = () => {
    removeToken();
    setUser(null);
    setToken(null);
    localStorage.removeItem('monitoring_resume_expected');
    localStorage.removeItem('monitoring_trigger_type');
    localStorage.removeItem('monitoring_resume_data');
    localStorage.removeItem('monitoring_sessionId');
    localStorage.removeItem('monitoring_sessions');
    // Reset filters
    localStorage.removeItem('github_analytics_selected_date');
    localStorage.removeItem('staff_ranking_active_filter');
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    loginWithToken,
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
