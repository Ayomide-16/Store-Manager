import React, { useState } from 'react';
import { useShop } from '../store';
import { UserRole } from '../types';
import { seedDatabase } from '../lib/supabase/seed';
import { LogIn, UserPlus, Eye, EyeOff, ShieldCheck, User as UserIcon, AlertCircle, ShoppingBag, Store, Database, Sparkles, Clock } from 'lucide-react';

const Login: React.FC = () => {
  const { login, register } = useShop();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [seedStatus, setSeedStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (isSignUp) {
        await register({ email, password, fullName, shopName });
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      let msg = err.message || "An authentication error occurred.";
      // User-friendly mapping for common Supabase Auth errors
      if (msg.includes("request this after")) {
        msg = "Too many attempts. Please wait a minute before trying again (Security rate limit).";
      } else if (msg.includes("Email not confirmed")) {
        msg = "Your email is not confirmed. Please try 'Onboarding' again or use a demo account.";
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoRole: UserRole) => {
    const demoEmail = demoRole === UserRole.ADMIN ? 'admin@demo.com' : 'salesperson@demo.com';
    setIsLoading(true);
    setError(null);
    try {
      await login(demoEmail, 'password123');
    } catch (err: any) {
      setError(`Demo access failed. Please click "Initialize Database" below if this project was recently created.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeedStatus('loading');
    setError(null);
    const results = await seedDatabase();
    if (results.errors.length > 0 && results.users === 0) {
      setSeedStatus('error');
      setError(`Database initialization failed: ${results.errors[0]}`);
    } else {
      setSeedStatus('success');
      setTimeout(() => setSeedStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 md:p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-indigo-600 p-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-16 -translate-y-16"></div>
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-inner border border-white/20">
            <LogIn className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">NaijaShop</h1>
          <p className="text-indigo-100 mt-2 font-medium opacity-90">Shop Management System</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-700 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed">{error}</p>
            </div>
          )}

          <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
            <button 
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isSignUp ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setIsSignUp(false); setError(null); }}
              disabled={isLoading}
            >
              Sign In
            </button>
            <button 
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isSignUp ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => { setIsSignUp(true); setError(null); }}
              disabled={isLoading}
            >
              Onboard Shop
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-5">
                <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><ShoppingBag className="w-5 h-5" /></div>
                  <p className="text-[10px] text-indigo-800 font-black uppercase tracking-widest leading-tight">Start managing your store today. Onboarding creates an owner account with auto-confirmed access.</p>
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Shop Name</label>
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Okoro Supermarket"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name (Owner)</label>
                  <input 
                    type="text" required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Chidi Okoro"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
              <input 
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@shop.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:bg-slate-300 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (isSignUp ? 'Onboard My Shop' : 'Sign In To Shop')}
            </button>
          </form>

          {!isSignUp && (
            <div className="mt-10 pt-8 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quick Demo Access</p>
                <button 
                  onClick={handleSeed}
                  disabled={seedStatus === 'loading'}
                  className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    seedStatus === 'success' ? 'text-emerald-500' : 'text-indigo-500 hover:underline'
                  }`}
                >
                  {seedStatus === 'loading' ? (
                    'Initializing...'
                  ) : seedStatus === 'success' ? (
                    <><Sparkles className="w-3 h-3" /> Ready!</>
                  ) : (
                    <><Database className="w-3 h-3" /> Initialize Database</>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleDemoLogin(UserRole.ADMIN)}
                  disabled={isLoading}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50 transition-all disabled:opacity-50"
                >
                  <ShieldCheck className="w-5 h-5 text-indigo-500" />
                  <span className="text-[10px] font-bold text-indigo-700">Owner Demo</span>
                </button>
                <button 
                  onClick={() => handleDemoLogin(UserRole.SALESPERSON)}
                  disabled={isLoading}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50 transition-all disabled:opacity-50"
                >
                  <UserIcon className="w-5 h-5 text-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-700">Sales Demo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
