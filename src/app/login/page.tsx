"use client";

import { useForm, FieldValues } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import api from '../services/api';
import { Lock, User, ArrowRight, Loader2, CheckCircle, Mail, Phone, ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import { Modal } from '../components/ui/Modal';

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'OWNER' | 'STAFF' | null>(null);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showContactAdminModal, setShowContactAdminModal] = useState(false);

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
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      setError('Invalid username or password. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white">
      
        {/* Left Side - Login Form */}
        <div className="w-full md:w-1/2 lg:w-1/2 p-8 md:p-12 flex flex-col justify-between bg-white relative">
          <div className="flex flex-col items-center w-full text-center">
            <div className="mb-4 animate-in fade-in zoom-in duration-700">
              <Image src="/LSBLogo.png" alt="LSB Logo" width={120} height={120} className="rounded-2xl shadow-lg" />
            </div>
            <p className="mt-2 text-slate-400 text-sm uppercase tracking-widest font-semibold">
              Business Management System
            </p>
            <div className="mt-6 flex gap-3 justify-center flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
                <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Secure
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
                <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Fast
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '450ms', animationFillMode: 'backwards' }}>
                <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Reliable
              </div>
            </div>
          </div>

          <div className="w-full max-w-md mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
              <p className="text-slate-500 mt-1">Please sign in to your account to continue.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    id="username"
                    type="text"
                    {...register('username', { required: 'Username is required' })}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.username ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-green-500'} rounded-xl text-slate-800 focus:ring-2 focus:border-transparent outline-none transition-all`}
                    placeholder="Enter your username"
                  />
                </div>
                {errors.username && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{errors.username.message as string}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    {...register('password', { 
                      required: 'Password is required',
                      minLength: { value: 6, message: 'Password must be at least 6 characters' }
                    })}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-green-500'} rounded-xl text-slate-800 focus:ring-2 focus:border-transparent outline-none transition-all`}
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{errors.password.message as string}</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-sm font-semibold text-green-600 hover:text-green-700 hover:underline transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-green-200 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 ${
                  isLoading
                    ? 'bg-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Signing in...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500">
                Don&apos;t have an account?{' '}
                <button 
                  type="button"
                  onClick={() => setShowContactAdminModal(true)}
                  className="font-bold text-slate-700 hover:text-green-600 hover:underline transition-colors"
                >
                  Contact Admin
                </button>
              </p>
            </div>
          </div>

          <div className="text-sm text-center text-slate-500">
            © 2026 LSB Store System. All rights reserved.
          </div>
        </div>

        {/* Right Side - Informative/Branding */}
        <div className="flex-1 bg-slate-900 p-12 text-white flex flex-col justify-center items-center relative overflow-hidden m-6 rounded-[3rem] shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-0"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-green-900/5 to-blue-900/5 z-0"></div>
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
          <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px]"></div>
          
          <div className="relative z-10 flex flex-col items-center w-full">
            <div className="text-center mb-10">
              <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">System Role Previews</h3>
              <p className="text-slate-400 text-lg max-w-md mx-auto">Explore the tailored interfaces designed for different levels of access.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-10 items-center justify-center mb-12">
            <button 
              onClick={() => setSelectedRole('OWNER')}
              className="flex flex-col items-center gap-4 group focus:outline-none transition-all"
            >
              <Image 
                src="/owner.png" 
                alt="Owner View" 
                width={380} 
                height={280} 
                className="rounded-xl shadow-2xl border border-slate-700/50 transition-all duration-500 group-hover:scale-105 group-hover:shadow-[0_0_40px_rgba(34,197,94,0.4)] group-hover:border-green-500/50" 
              />
              <span className="text-slate-400 font-bold tracking-widest uppercase text-sm group-hover:text-white transition-colors">Owner</span>
            </button>
            <button 
              onClick={() => setSelectedRole('STAFF')}
              className="flex flex-col items-center gap-4 group focus:outline-none transition-all"
            >
              <Image 
                src="/staff.png" 
                alt="Staff View" 
                width={380} 
                height={280} 
                className="rounded-xl shadow-2xl border border-slate-700/50 transition-all duration-500 group-hover:scale-105 group-hover:shadow-[0_0_40px_rgba(34,197,94,0.4)] group-hover:border-green-500/50" 
              />
              <span className="text-slate-400 font-bold tracking-widest uppercase text-sm group-hover:text-white transition-colors">Staff</span>
            </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
               <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
                  <h4 className="font-bold text-green-400 mb-2 text-sm uppercase tracking-wider">Real-time Data</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">Instant updates on sales, inventory, and expenses across all branches.</p>
               </div>
               <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
                  <h4 className="font-bold text-blue-400 mb-2 text-sm uppercase tracking-wider">Secure Access</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">Role-based authentication ensures data integrity and privacy.</p>
               </div>
               <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
                  <h4 className="font-bold text-purple-400 mb-2 text-sm uppercase tracking-wider">Smart Analytics</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">Data-driven insights to optimize business performance.</p>
               </div>
            </div>
          </div>

          <Modal isOpen={!!selectedRole} onClose={() => setSelectedRole(null)} title={selectedRole === 'OWNER' ? 'Owner Dashboard' : 'Staff Interface'}>
            <div className="space-y-4 text-slate-600">
              {selectedRole === 'OWNER' ? (
                <>
                  <p>The Owner Dashboard provides a comprehensive high-level view of the entire business operation.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Real-time revenue and expense tracking.</li>
                    <li>Inventory management across all branches.</li>
                    <li>Detailed analytics and performance reports.</li>
                    <li>Management of staff and branches.</li>
                  </ul>
                </>
              ) : (
                <>
                  <p>The Staff Interface is designed for efficiency and speed in daily operations.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Quick point-of-sale (POS) system.</li>
                    <li>Inventory tracking and stock updates.</li>
                    <li>Delivery acceptance and management.</li>
                    <li>Daily transaction history.</li>
                  </ul>
                </>
              )}
              <div className="pt-4 flex justify-end">
                <button 
                  onClick={() => setSelectedRole(null)}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>

          <Modal isOpen={showForgotPasswordModal} onClose={() => setShowForgotPasswordModal(false)} title="Forgot Password?">
            <div className="space-y-4 text-slate-600">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex gap-3">
                <div className="mt-1"><User className="w-5 h-5 text-slate-400" /></div>
                <div>
                  <p className="font-medium text-slate-800 mb-1">For Staff Members</p>
                  <p className="text-sm">Please contact the <strong>Owner</strong> or <strong>Admin</strong> to change your password.</p>
                </div>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex gap-3">
                <div className="mt-1"><ShieldAlert className="w-5 h-5 text-slate-400" /></div>
                <div>
                  <p className="font-medium text-slate-800 mb-1">For System Owner</p>
                  <p className="text-sm">Please contact the <strong>System Developer</strong> to change your password.</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>

          <Modal isOpen={showContactAdminModal} onClose={() => setShowContactAdminModal(false)} title="Contact Administrator">
            <div className="space-y-4 text-slate-600">
              <p className="text-sm">If you need an account or are experiencing issues, please reach out to the system administrator.</p>
              
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="p-2 bg-white rounded-full shadow-sm text-green-600">
                    <Mail className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Email Support</p>
                    <p className="text-sm font-medium text-slate-800">kenkenlobos8@gmail.com</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="p-2 bg-white rounded-full shadow-sm text-blue-600">
                    <Phone className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Phone Support</p>
                    <p className="text-sm font-medium text-slate-800">+63 954 304 3030</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  onClick={() => setShowContactAdminModal(false)}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        </div>
    </div>
  );
}