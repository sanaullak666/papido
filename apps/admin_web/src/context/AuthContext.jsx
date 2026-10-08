import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Regular Customer / Rider State
  const [token, setToken] = useState(() => localStorage.getItem('papido_user_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('papido_user');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });

  // Dedicated Admin State
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('papido_admin_token') || null);
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = localStorage.getItem('papido_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // Listen for 401 unauthorized or 403 role violation events to instantly reset state
  useEffect(() => {
    const handleUnauthorized = (e) => {
      const isAdmin = e.detail?.isAdmin;
      const reason = e.detail?.reason;
      if (isAdmin) {
        setAdminToken(null);
        setAdminUser(null);
        localStorage.removeItem('papido_admin_token');
        localStorage.removeItem('papido_admin_user');
        if (reason === 'unauthorized_role') {
          window.location.replace('/AdminLogin?reason=unauthorized_role');
        }
      } else {
        setToken(null);
        setUser(null);
        localStorage.removeItem('papido_user_token');
        localStorage.removeItem('papido_user');
        if (reason === 'unauthorized_role') {
          window.location.replace('/login?reason=unauthorized_role');
        }
      }
    };

    const handleSessionExpired = (e) => {
      const isAdmin = e.detail?.isAdmin;
      if (isAdmin) {
        setAdminToken(null);
        setAdminUser(null);
        localStorage.removeItem('papido_admin_token');
        localStorage.removeItem('papido_admin_user');
        const curPath = (window.location.pathname || '').toLowerCase();
        if (curPath.startsWith('/admin') && curPath !== '/adminlogin') {
          window.location.replace('/AdminLogin?reason=session_expired');
        }
      } else {
        setToken(null);
        setUser(null);
        localStorage.removeItem('papido_user_token');
        localStorage.removeItem('papido_user');
        const curPath = (window.location.pathname || '').toLowerCase();
        if (curPath !== '/login' && curPath !== '/' && curPath !== '/welcome') {
          window.location.replace('/login?reason=session_expired');
        }
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('auth:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('auth:session_expired', handleSessionExpired);
    };
  }, []);

  // Load User & Admin profiles on start in the background
  useEffect(() => {
    async function loadSessions() {
      // 1. Check User token (Customer/Rider)
      if (token) {
        try {
          const res = await apiRequest('/auth/me', 'GET', null, token);
          if (['CUSTOMER', 'RIDER'].includes(res.data?.user?.role)) {
            const fullUser = {
              ...res.data.user,
              profile: res.data.profile || {}
            };
            setUser(fullUser);
            localStorage.setItem('papido_user', JSON.stringify(fullUser));
          } else {
            localStorage.removeItem('papido_user_token');
            localStorage.removeItem('papido_user');
            setToken(null);
            setUser(null);
          }
        } catch (err) {
          localStorage.removeItem('papido_user_token');
          localStorage.removeItem('papido_user');
          setToken(null);
          setUser(null);
        }
      }

      // 2. Check Admin token
      if (adminToken) {
        try {
          const res = await apiRequest('/auth/me', 'GET', null, adminToken);
          if (res.data?.user?.role === 'ADMIN') {
            setAdminUser(res.data.user);
            localStorage.setItem('papido_admin_user', JSON.stringify(res.data.user));
          } else {
            localStorage.removeItem('papido_admin_token');
            localStorage.removeItem('papido_admin_user');
            setAdminToken(null);
            setAdminUser(null);
          }
        } catch (err) {
          localStorage.removeItem('papido_admin_token');
          localStorage.removeItem('papido_admin_user');
          setAdminToken(null);
          setAdminUser(null);
        }
      }
    }

    loadSessions();
  }, [token, adminToken]);

  // Customer / Rider Login (Strictly rejects ADMIN role)
  const login = async (email, password, expectedRole = null) => {
    const res = await apiRequest('/auth/login', 'POST', {
      email,
      password,
      expectedRole: expectedRole || null
    });
    const { user: userData, accessToken } = res.data;
    if (userData.role === 'ADMIN') {
      throw new Error('This portal is for students and riders only. Administrators must use the separate Admin Portal.');
    }
    localStorage.setItem('papido_user_token', accessToken);
    localStorage.setItem('papido_user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    return userData;
  };

  // Dedicated Admin Login (Strictly requires ADMIN role)
  const adminLogin = async (email, password) => {
    const res = await apiRequest('/auth/login', 'POST', {
      email,
      password,
      expectedRole: 'ADMIN'
    });
    const { user: userData, accessToken } = res.data;
    if (userData.role !== 'ADMIN') {
      throw new Error('Access Denied: Administrator credentials required.');
    }
    localStorage.setItem('papido_admin_token', accessToken);
    localStorage.setItem('papido_admin_user', JSON.stringify(userData));
    setAdminToken(accessToken);
    setAdminUser(userData);
    return userData;
  };

  // Register Customer / Rider
  const register = async (registerData) => {
    const res = await apiRequest('/auth/register', 'POST', registerData);
    const { user: userData, accessToken } = res.data;
    if (accessToken) {
      localStorage.setItem('papido_user_token', accessToken);
      localStorage.setItem('papido_user', JSON.stringify(userData));
      setToken(accessToken);
      setUser(userData);
    }
    return res;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const activeToken = token || adminToken;
    const body = typeof currentPassword === 'object' && currentPassword !== null
      ? currentPassword
      : { currentPassword, newPassword };
    return apiRequest('/auth/change-password', 'POST', body, activeToken);
  };

  const forgotPassword = async (email) => {
    return apiRequest('/auth/forgot-password', 'POST', { email });
  };

  const resetPassword = async (email, otp, newPassword) => {
    return apiRequest('/auth/reset-password', 'POST', {
      email,
      otp,
      newPassword
    });
  };

  const updateProfile = async (profileData) => {
    const activeToken = token || adminToken;
    const res = await apiRequest('/auth/profile', 'PATCH', profileData, activeToken);
    if (res.data?.user) {
      setUser(prev => {
        const updated = {
          ...prev,
          ...res.data.user,
          profile: res.data.profile || prev?.profile || {}
        };
        localStorage.setItem('papido_user', JSON.stringify(updated));
        return updated;
      });
    }
    return res;
  };

  const logout = (redirectUrl = '/login') => {
    localStorage.removeItem('papido_user_token');
    localStorage.removeItem('papido_user');
    try {
      const authErr = sessionStorage.getItem('papido_auth_error');
      sessionStorage.clear();
      if (authErr) {
        sessionStorage.setItem('papido_auth_error', authErr);
      }
    } catch (_) {}
    setToken(null);
    setUser(null);
    if (redirectUrl) {
      window.location.replace(redirectUrl);
    }
  };

  const adminLogout = () => {
    localStorage.removeItem('papido_admin_token');
    localStorage.removeItem('papido_admin_user');
    try {
      sessionStorage.clear();
    } catch (_) {}
    setAdminToken(null);
    setAdminUser(null);
    window.location.replace('/AdminLogin');
  };

  // Mobile Login with Email OTP
  const sendLoginOtp = async (phone, expectedRole = null) => {
    const res = await apiRequest('/auth/send-login-otp', 'POST', {
      phone,
      expectedRole
    });
    return res.data;
  };

  const verifyLoginOtp = async (phone, otp, expectedRole = null) => {
    const res = await apiRequest('/auth/verify-login-otp', 'POST', {
      phone,
      otp,
      expectedRole
    });
    const { user: userData, accessToken } = res.data;
    if (userData.role === 'ADMIN') {
      throw new Error('This portal is for students and riders only. Administrators must use the separate Admin Portal.');
    }
    localStorage.setItem('papido_user_token', accessToken);
    localStorage.setItem('papido_user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
    return userData;
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      adminUser,
      adminToken,
      loading,
      login,
      adminLogin,
      sendLoginOtp,
      verifyLoginOtp,
      register,
      changePassword,
      forgotPassword,
      resetPassword,
      updateProfile,
      logout,
      adminLogout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
