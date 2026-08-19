import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Regular Customer / Rider State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('papido_user_token') || null);

  // Dedicated Admin State
  const [adminUser, setAdminUser] = useState(null);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('papido_admin_token') || null);

  const [loading, setLoading] = useState(true);

  // Load User & Admin profiles on start
  useEffect(() => {
    async function loadSessions() {
      // 1. Check User token (Customer/Rider)
      if (token) {
        try {
          const res = await apiRequest('/auth/me', 'GET', null, token);
          if (['CUSTOMER', 'RIDER'].includes(res.data.user.role)) {
            setUser({
              ...res.data.user,
              profile: res.data.profile || {}
            });
          } else {
            localStorage.removeItem('papido_user_token');
            setToken(null);
            setUser(null);
          }
        } catch (err) {
          localStorage.removeItem('papido_user_token');
          setToken(null);
          setUser(null);
        }
      }

      // 2. Check Admin token
      if (adminToken) {
        try {
          const res = await apiRequest('/auth/me', 'GET', null, adminToken);
          if (res.data.user.role === 'ADMIN') {
            setAdminUser(res.data.user);
          } else {
            localStorage.removeItem('papido_admin_token');
            setAdminToken(null);
            setAdminUser(null);
          }
        } catch (err) {
          localStorage.removeItem('papido_admin_token');
          setAdminToken(null);
          setAdminUser(null);
        }
      }

      setLoading(false);
    }

    loadSessions();
  }, [token, adminToken]);

  // Customer / Rider Login (Strictly rejects ADMIN role)
  const login = async (email, password) => {
    const res = await apiRequest('/auth/login', 'POST', {
      email,
      password
    });
    const { user: userData, accessToken } = res.data;
    if (userData.role === 'ADMIN') {
      throw new Error('This portal is for students and riders only. Administrators must use the separate Admin Portal.');
    }
    localStorage.setItem('papido_user_token', accessToken);
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
      setToken(accessToken);
      setUser(userData);
    }
    return res;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const activeToken = token || adminToken;
    return apiRequest('/auth/change-password', 'POST', {
      currentPassword,
      newPassword
    }, activeToken);
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
      setUser(prev => ({
        ...prev,
        ...res.data.user,
        profile: res.data.profile || prev?.profile || {}
      }));
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('papido_user_token');
    setToken(null);
    setUser(null);
  };

  const adminLogout = () => {
    localStorage.removeItem('papido_admin_token');
    setAdminToken(null);
    setAdminUser(null);
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
