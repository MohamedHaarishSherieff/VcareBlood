import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Firebase Cloud Functions base URL - PRODUCTION
// For physical devices and APK builds, always use Firebase Functions
const FIREBASE_FUNCTIONS_BASE_URL = 'https://us-central1-vcare-app-82fed.cloudfunctions.net';

// Development URLs (only for emulator/testing)
const DEV_URLS = {
  android_emulator: 'http://10.0.2.2:5001', // Android emulator
  web_local: 'http://localhost:5001',       // Web local
  web_127: 'http://127.0.0.1:5001',        // Web localhost
};

const getBaseURL = () => {
  // Check for explicit environment variable (takes precedence)
  if (process.env.API_BASE_URL) {
    console.log('[API] Using API_BASE_URL from env:', process.env.API_BASE_URL);
    return process.env.API_BASE_URL;
  }
  
  // For production APK/real devices, always use Firebase Functions
  if (Platform.OS === 'android') {
    console.log('[API] Android device detected, using Firebase Functions URL');
    return FIREBASE_FUNCTIONS_BASE_URL;
  }
  
  // Development URLs
  if (Platform.OS === 'web') {
    const url = `http://${window.location.hostname}:5001`;
    console.log('[API] Web platform, using local backend:', url);
    return url;
  }
  
  // Default to Firebase Functions for any other platform
  console.log('[API] Using default Firebase Functions URL');
  return FIREBASE_FUNCTIONS_BASE_URL;
};

const baseURL = getBaseURL();

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

const getFriendlyErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred. Please try again.';
  if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  if (error.code === 'ERR_NETWORK' || error.message?.toLowerCase().includes('network error') || error.code === 'NETWORK_ALL_FAILED') {
    return 'Network error. Please check your connection.';
  }
  if (error.code === 'unavailable' || error.message?.toLowerCase().includes('request failed')) {
    return 'Network error. Please check your connection.';
  }
  if (error.response) {
    const { status } = error.response;
    if (status >= 500) return 'Server error. Please try again later.';
    if (status === 404) return 'Requested resource was not found.';
    if (status === 401 || status === 403) return 'Authentication error. Please log in again.';
    return 'Request failed. Please check your input and try again.';
  }
  return 'Network error. Please check your connection.';
};

export const handleApiError = (error) => {
  const message = getFriendlyErrorMessage(error);
  const status = error?.response?.status ?? null;
  const safeError = new Error(message);

  safeError.name = error?.name || 'ApiError';
  safeError.status = status;
  safeError.isNetworkError = !error?.response;
  safeError.originalError = error;
  safeError.response = error?.response;
  safeError.config = error?.config;

  console.error('API Error:', {
    url: error?.config?.url,
    method: error?.config?.method,
    status,
    originalMessage: error?.message,
    responseData: error?.response?.data,
  });

  return safeError;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const safeError = handleApiError(error);
    return Promise.reject(safeError);
  }
);

export { api };
export default api;