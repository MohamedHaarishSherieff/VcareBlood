/**
 * Production Environment Configuration for APK Build
 * This file contains the production settings for the mobile app
 */

export const PRODUCTION_CONFIG = {
  // Firebase Cloud Functions Base URL
  // This URL is used for all API calls in production (physical devices)
  API_BASE_URL: 'https://us-central1-vcare-app-82fed.cloudfunctions.net',
  
  // Firebase Configuration
  FIREBASE: {
    apiKey: 'AIzaSyCD0XhDr1djCOQsSOa1irzpGNlNJlUcl2k',
    authDomain: 'vcare-app-82fed.firebaseapp.com',
    projectId: 'vcare-app-82fed',
    storageBucket: 'vcare-app-82fed.firebasestorage.app',
    messagingSenderId: '895491765469',
    appId: '1:895491765469:web:828c8d8fe087de71725734',
    measurementId: 'G-44W6TJXF15',
  },
  
  // App Configuration
  APP: {
    name: 'V-Care',
    version: '1.0.0',
    package: 'com.vcare.app',
  },
  
  // Feature Flags
  FEATURES: {
    AI_CHAT: true,
    DONOR_SEARCH: true,
    BLOOD_DONATION: true,
    USER_POSTS: true,
    NOTIFICATIONS: true,
  },
  
  // API Timeouts
  API_TIMEOUT: 10000, // 10 seconds
  
  // Debug Settings (disable for production APK)
  DEBUG: false,
};

export default PRODUCTION_CONFIG;
