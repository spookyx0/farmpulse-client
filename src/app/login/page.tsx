"use client";

import { useForm, FieldValues } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import api from '../services/api';

export default function LoginPage() {
  const { register, handleSubmit } = useForm();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: FieldValues) => {
    setIsLoading(true);
    try {
      setError(null);
      const response = await api.post('/auth/login', {
        username: data.username,
        password: data.password,
      });
      const { access_token } = response.data;
      if (access_token) {
        login(access_token);
      }
    } catch (err) {
      setError('Invalid username or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-teal-700 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gray-50 p-8 text-center border-b border-gray-100">
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
            Farm<span className="text-green-600">Pulse</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Business Management System
          </p>
        </div>

        <div className="p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                {...register('username', { required: true })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                {...register('password', { required: true })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg text-white font-semibold shadow-md transition-all transform active:scale-95 ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 hover:shadow-lg'
              }`}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-100">
          © 2025 FarmPulse System. All rights reserved.
        </div>
      </div>
    </div>
  );
}