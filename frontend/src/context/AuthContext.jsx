'use client';
// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import api, { setAccessToken, clearAccessToken } from '@/lib/api';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    clearAccessToken();
    setUser(null);
    window.location.href = '/login';
  }, []);

  // Called by AppShell on every page load/refresh.
  // Tries to get a new access token using the httpOnly refresh cookie.
  // Returns true if session was restored, false if user needs to log in.
  const refreshSession = useCallback(async () => {
    try {
      const { data } = await axios.post(
        '/api/auth/refresh',
        {},
        { withCredentials: true }
      );
      setAccessToken(data.accessToken);

      // Also fetch the user profile so we have role/name available
      const profileRes = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${data.accessToken}` },
        withCredentials: true,
      });
      setUser(profileRes.data);
      return true;
    } catch {
      clearAccessToken();
      setUser(null);
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshSession, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}