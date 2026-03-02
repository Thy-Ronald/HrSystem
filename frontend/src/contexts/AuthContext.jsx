import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth } from '../config/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
  onIdTokenChanged,
} from 'firebase/auth';
import { getToken, removeToken, setToken as saveToken } from '../utils/auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken]     = useState(null);

  // Prevent onIdTokenChanged from firing "not logged in" while OAuth is exchanging
  const oauthInProgressRef = useRef(false);
  // Track current user in a ref so closures in onIdTokenChanged can read it
  const userRef = useRef(null);

  // ── Shared: call /api/auth/verify with a Firebase ID token ───────────────
  const callVerifyEndpoint = async (idToken, isNewLogin = false) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Server returned invalid response');
      }

      const data = await response.json();

      if (response.ok && data.success) {
        userRef.current = data.user;
        setUser(data.user);
        setToken(idToken);
        saveToken(idToken);

        if (data.monitoringExpected) {
          localStorage.setItem('monitoring_resume_expected', 'true');
          localStorage.setItem('monitoring_trigger_type', isNewLogin ? 'login' : 'refresh');
          if (data.activeRequest) {
            localStorage.setItem('monitoring_resume_data', JSON.stringify(data.activeRequest));
          }
        }

        return { success: true, user: data.user, token: idToken };
      } else {
        userRef.current = null;
        setUser(null);
        setToken(null);
        removeToken();
        return { success: false };
      }
    } catch (error) {
      console.error('[AuthContext] Verify failed:', error);
      userRef.current = null;
      setUser(null);
      setToken(null);
      removeToken();
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // ── Master auth listener ──────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        saveToken(idToken);   // keep cookie fresh for api.js
        setToken(idToken);

        // Only call verify on initial/session-restore load (not on every token refresh)
        if (userRef.current === null) {
          await callVerifyEndpoint(idToken, false);
        }
      } else {
        // Signed out or no session
        if (oauthInProgressRef.current) return; // OAuth is about to sign in — wait
        userRef.current = null;
        setUser(null);
        setToken(null);
        removeToken();
        setLoading(false);
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handle GitHub OAuth callback code in URL ──────────────────────────────
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const oauthCode = params.get('code');
    if (!oauthCode) return;

    oauthInProgressRef.current = true;
    window.history.replaceState({}, '', window.location.pathname);

    fetch(`${API_BASE}/api/auth/exchange?code=${encodeURIComponent(oauthCode)}`)
      .then((r) => r.json())
      .then(async ({ customToken }) => {
        if (customToken) {
          await signInWithCustomToken(auth, customToken);
          // onIdTokenChanged fires → userRef.current is null → callVerifyEndpoint runs
        } else {
          console.error('[AuthContext] Exchange returned no customToken');
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[AuthContext] OAuth exchange failed:', err);
        setLoading(false);
      })
      .finally(() => {
        oauthInProgressRef.current = false;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Login (email / password) ──────────────────────────────────────────────
  const login = async (email, password) => {
    try {
      const cred    = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      const result  = await callVerifyEndpoint(idToken, true /* isNewLogin */);

      if (!result.success) {
        throw new Error('Could not load user profile. Please try again.');
      }

      return { success: true, user: result.user, token: idToken };
    } catch (error) {
      // Map Firebase error codes to UI-friendly messages
      const code = error.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password');
      }
      if (code === 'auth/too-many-requests') {
        const err = new Error('Too many failed attempts. Please try again later or reset your password.');
        err.isRateLimited = true;
        err.retryAfter    = Date.now() + 15 * 60 * 1000;
        throw err;
      }
      if (code === 'auth/user-disabled') {
        throw new Error('This account has been disabled. Please contact support.');
      }
      throw error;
    }
  };

  // ── Signup ────────────────────────────────────────────────────────────────
  const signup = async (email, password, name, role) => {
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const code = error.code;
      if (code === 'auth/email-already-in-use') throw new Error('An account with this email already exists');
      if (code === 'auth/weak-password')         throw new Error('Password must be at least 6 characters long');
      if (code === 'auth/invalid-email')         throw new Error('Invalid email format');
      throw error;
    }

    const idToken = await cred.user.getIdToken();

    // Create MySQL profile on backend
    const response = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: name.trim(), role: role || 'employee' }),
    });

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error(`Server error: ${response.status}. Check if the backend is running.`);
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Signup failed');
    }

    userRef.current = data.user;
    setUser(data.user);
    setToken(idToken);
    saveToken(idToken);
    setLoading(false);

    return { success: true, user: data.user, token: idToken };
  };

  // ── loginWithToken — kept for any code that passes a resolved user + token ─
  const loginWithToken = async (tokenToUse, userData) => {
    userRef.current = userData;
    setUser(userData);
    setToken(tokenToUse);
    saveToken(tokenToUse);
    return { success: true, user: userData, token: tokenToUse };
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    await signOut(auth);
    userRef.current = null;
    setUser(null);
    setToken(null);
    removeToken();
    localStorage.removeItem('monitoring_resume_expected');
    localStorage.removeItem('monitoring_trigger_type');
    localStorage.removeItem('monitoring_resume_data');
    localStorage.removeItem('monitoring_sessionId');
    localStorage.removeItem('monitoring_sessions');
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

