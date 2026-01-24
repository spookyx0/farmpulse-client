/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { InternalAxiosRequestConfig } from 'axios';

// 1. Use Env Variable, fallback to localhost
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Request Interceptor: Attach Token from SessionStorage
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('token');
      
      // Safety check: Create headers object if it doesn't exist
      if (!config.headers) {
        config.headers = {} as any;
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 3. Response Interceptor: Auto-Logout on 401 (With Logic Fix)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // FIX: Check if the error came from the Login Endpoint
    // We use optional chaining and check if the URL includes 'login'
    const isLoginRequest = error.config && error.config.url?.includes('/auth/login');

    // Only trigger "Session Expired" logic if it is NOT a login request
    if (error.response?.status === 401 && !isLoginRequest) {
      if (typeof window !== 'undefined') {
        // Only log this for actual session expirations (e.g. Dashboard access)
        console.warn('Session expired. Logging out...');
        sessionStorage.removeItem('token');
        localStorage.removeItem('token'); 
        
        // Optional: Force redirect if user is not already on login page
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
      }
    }
    
    // Always return the error so the calling component (LoginPage) can handle it
    return Promise.reject(error);
  }
);

export default api;