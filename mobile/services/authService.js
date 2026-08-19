import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { handleApiError } from './api';
import axios from 'axios';
import { Platform } from 'react-native';

const ACCESS_KEY = 'vcare_access_token';
const REFRESH_KEY = 'vcare_refresh_token';

const authService = {
  register: async (payload) => {
    try {
      const res = await api.post('/api/auth/register', payload);
      const { accessToken, refreshToken, user } = res.data;
      if (accessToken && refreshToken) {
        await AsyncStorage.setItem(ACCESS_KEY, accessToken);
        await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      }
      return { user, accessToken, refreshToken };
    } catch (err) {
      throw handleApiError(err);
    }
  },

  login: async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data;
      await AsyncStorage.setItem(ACCESS_KEY, accessToken);
      await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
      if (user && user.id) await AsyncStorage.setItem('userId', user.id);
      if (user && user.phoneNumber) await AsyncStorage.setItem('userPhoneNumber', user.phoneNumber);
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      return { user, accessToken, refreshToken };
    } catch (err) {
      throw handleApiError(err);
    }
  },

  loginWithPhone: async (phoneNumber) => {
    const hosts = [];
    if (Platform.OS === 'android') {
      hosts.push('http://10.0.2.2:5001');
    }
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      hosts.push(`http://${window.location.hostname}:5001`);
    }
    hosts.push('http://localhost:5001', 'http://127.0.0.1:5001');

    let res;
    try {
      res = await api.post('/api/auth/login-phone', { phoneNumber });
    } catch (err) {
      const fallbackError = err;
      if (err.isNetworkError || err.code === 'ERR_NETWORK' || err.message?.toLowerCase().includes('network error')) {
        for (const host of hosts) {
          try {
            res = await axios.post(`${host}/api/auth/login-phone`, { phoneNumber }, { timeout: 6000, headers: { 'Content-Type': 'application/json' } });
            api.defaults.baseURL = host;
            break;
          } catch (e) {
            fallbackError.originalError = e;
          }
        }
        if (!res) {
          throw handleApiError({ ...fallbackError, code: 'NETWORK_ALL_FAILED', message: 'Network error. Please check your connection.' });
        }
      } else {
        throw handleApiError(err);
      }
    }

    try {
      const { accessToken, refreshToken, user } = res.data;
      await AsyncStorage.setItem(ACCESS_KEY, accessToken);
      await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
      if (user && user.id) await AsyncStorage.setItem('userId', user.id);
      if (phoneNumber) await AsyncStorage.setItem('userPhoneNumber', phoneNumber);
      else if (user && user.phoneNumber) await AsyncStorage.setItem('userPhoneNumber', user.phoneNumber);
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      return { user, accessToken, refreshToken };
    } catch (err) {
      throw handleApiError(err);
    }
  },

  logout: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
      if (refreshToken) await api.post('/api/auth/logout', { refreshToken });
    } catch (err) {
      const isNetwork = err.isNetworkError || err.code === 'ERR_NETWORK';
      if (!isNetwork) {
        console.warn('Logout failed but continuing to clear local state:', err);
      }
    }
    await AsyncStorage.removeItem(ACCESS_KEY);
    await AsyncStorage.removeItem(REFRESH_KEY);
    delete api.defaults.headers.common.Authorization;
  },

  getAccessToken: async () => {
    return await AsyncStorage.getItem(ACCESS_KEY);
  },

  setAccessToken: async (token) => {
    if (token) {
      await AsyncStorage.setItem(ACCESS_KEY, token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      await AsyncStorage.removeItem(ACCESS_KEY);
      delete api.defaults.headers.common.Authorization;
    }
  },

  refresh: async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
      if (!refreshToken) throw new Error('No refresh token');
      const res = await api.post('/api/auth/refresh', { refreshToken });
      const { accessToken, refreshToken: newRefresh } = res.data;
      await AsyncStorage.setItem(ACCESS_KEY, accessToken);
      if (newRefresh) await AsyncStorage.setItem(REFRESH_KEY, newRefresh);
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      return accessToken;
    } catch (err) {
      throw handleApiError(err);
    }
  }
};

// Axios response interceptor to auto-refresh on 401
api.interceptors.response.use(
  r => r,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const newAccess = await authService.refresh();
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (e) {
        // refresh failed, clear storage
        await authService.logout();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default authService;
