import React, { createContext, useState, useEffect, useContext } from 'react';
import { api, setAccessToken } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Recover session on mount
  useEffect(() => {
    const recoverSession = async () => {
      try {
        // 1. Try to get a new access token via refresh token cookie
        const refreshRes = await fetch('http://localhost:5000/api/auth/refresh-token', {
          method: 'POST',
          credentials: 'include',
        });

        if (!refreshRes.ok) {
          throw new Error('No refresh token active');
        }

        const refreshData = await refreshRes.ok ? await refreshRes.json() : {};
        if (refreshData.accessToken) {
          setAccessToken(refreshData.accessToken);
          
          // 2. Fetch user profile details
          const meRes = await api.get('/auth/me');
          if (meRes.ok) {
            const meData = await meRes.json();
            setUser(meData.user);
          }
        }
      } catch (err) {
        console.log('[AuthContext] No active session restored:', err.message);
      } finally {
        setLoading(false);
      }
    };

    recoverSession();

    // Event listener for background token refresh expiration
    const handleAuthExpired = () => {
      setUser(null);
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  // Login handler
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      setAccessToken(data.accessToken);
      setUser(data.user);
      return data;
    } catch (err) {
      throw err;
    }
  };

  // Register handler
  const register = async (name, email, password) => {
    try {
      const res = await api.post('/auth/register', { name, email, password });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setAccessToken(data.accessToken);
      setUser(data.user);
      return data;
    } catch (err) {
      throw err;
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout request failed:', err.message);
    } finally {
      setAccessToken('');
      setUser(null);
    }
  };

  // Utility to update user details in local state (e.g. after uploading resume)
  const updateUserState = (updatedUserFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUserFields } : null));
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUserState,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
