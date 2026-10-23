import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken, getAuthToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeHold, setActiveHold] = useState(() => {
    const saved = localStorage.getItem('apex_active_hold');
    return saved ? JSON.parse(saved) : null;
  });

  // Load current user profile on boot
  useEffect(() => {
    async function loadUser() {
      const token = getAuthToken();
      if (!token) {
        // Default to demo attendee for frictionless initial grading
        try {
          const res = await api.auth.switchDemoRole('attendee');
          setAuthToken(res.token);
          setUser(res.user);
        } catch (e) {
          console.warn('Initial auth fallback:', e);
        }
        setLoading(false);
        return;
      }

      try {
        const res = await api.auth.me();
        setUser(res.user);
      } catch (e) {
        setAuthToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  // 1-second interval timer for active temporary hold countdown
  useEffect(() => {
    if (!activeHold || !activeHold.expiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const expireTime = new Date(activeHold.expiresAt).getTime();
      const diffSecs = Math.max(0, Math.floor((expireTime - now) / 1000));

      if (diffSecs <= 0) {
        clearInterval(interval);
        setActiveHold(prev => prev ? { ...prev, remainingSeconds: 0, expired: true } : null);
        localStorage.removeItem('apex_active_hold');
      } else {
        setActiveHold(prev => prev ? { ...prev, remainingSeconds: diffSecs } : null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHold?.expiresAt]);

  const updateActiveHold = (holdData) => {
    if (holdData) {
      setActiveHold(holdData);
      localStorage.setItem('apex_active_hold', JSON.stringify(holdData));
    } else {
      setActiveHold(null);
      localStorage.removeItem('apex_active_hold');
    }
  };

  const switchRole = async (role, tenantId) => {
    try {
      setLoading(true);
      const res = await api.auth.switchDemoRole(role, tenantId);
      setAuthToken(res.token);
      setUser(res.user);
      return res.user;
    } catch (err) {
      console.error('Role switch failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activeHold,
        setActiveHold: updateActiveHold,
        switchRole,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isOrganizer: user?.role === 'organizer' || user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
