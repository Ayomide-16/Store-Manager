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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-6 custom-scrollbar">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="bg-slate-900 p-10 text-white text-center relative overflow-hidden flex flex-col items-center justify-center border-b border-slate-100">
          <div className="w-20 h-20 bg-blue-600 text-white border border-slate-200 rounded-[2rem] shadow-sm flex items-center justify-center mx-auto mb-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
            <LogIn className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight font-medium tracking-tight ">NaijaShop</h1>
          <p className="text-[#10b981] mt-2 font-medium text-[10px]  tracking-normal font-bold">Shop Management System</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-8 p-5 bg-red-600 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 flex items-start gap-3 text-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <p className="text-xs font-medium font-bold leading-relaxed ">{error}</p>
            </div>
          )}

          <div className="flex p-1 bg-slate-100/80 border border-slate-200/60 rounded-full mb-8">
            <button 
              className={`flex-1 py-3 text-xs font-bold rounded-full tracking-normal transition-all ${!isSignUp ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              onClick={() => { setIsSignUp(false); setError(null); }}
              disabled={isLoading}
            >
              Sign In
            </button>
            <button 
              className={`flex-1 py-3 text-xs font-bold rounded-full tracking-normal transition-all ${isSignUp ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              onClick={() => { setIsSignUp(true); setError(null); }}
              disabled={isLoading}
            >
              Onboard Shop
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-6">
                <div className="mb-8 p-5 bg-[#10b981] border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 flex items-center gap-4 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                  <div className="w-12 h-12 bg-slate-900 text-white border border-slate-200 rounded-2xl flex items-center justify-center shrink-0"><ShoppingBag className="w-6 h-6" /></div>
                  <p className="text-[10px] text-slate-900 font-medium font-bold  tracking-normal leading-relaxed">Start managing your store today. Onboarding creates an owner account with auto-confirmed access.</p>
                </div>
                
                <div>
                  <label className="block text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-2">Shop Name</label>
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-900" />
                    <input 
                      type="text" required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Okoro Supermarket"
                      className="w-full pl-12 pr-4 py-4 bg-white/60 backdrop-blur-3xl border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 focus:bg-white outline-none font-medium font-bold text-slate-900 placeholder:text-slate-400 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-2">Full Name (Owner)</label>
                  <input 
                    type="text" required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Chidi Okoro"
                    className="w-full px-4 py-4 bg-white/60 backdrop-blur-3xl border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 focus:bg-white outline-none font-medium font-bold text-slate-900 placeholder:text-slate-400 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-2">Email Address</label>
              <input 
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@shop.com"
                className="w-full px-4 py-4 bg-white/60 backdrop-blur-3xl border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 focus:bg-white outline-none font-medium font-bold text-slate-900 placeholder:text-slate-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-2">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-4 bg-white/60 backdrop-blur-3xl border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 focus:bg-white outline-none font-medium font-bold text-slate-900 placeholder:text-slate-400 transition-colors text-xl font-sans"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 hover:text-blue-500 bg-white border border-slate-200 rounded-2xl p-1 shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-black text-[#10b981] border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 font-medium font-bold text-xs  tracking-normal py-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all disabled:bg-slate-300 disabled:text-slate-500 disabled:border-slate-400 disabled:shadow-none flex items-center justify-center gap-3 mt-8"
            >
              {isLoading ? (
                <>
                  <Clock className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (isSignUp ? 'Onboard My Shop' : 'Sign In To Shop')}
            </button>
          </form>

          {!isSignUp && (
            <div className="mt-12 pt-8 border-t border-slate-100 border-dashed">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <p className="text-[10px] font-medium font-bold text-slate-900  tracking-normal bg-[#10b981] px-2 py-1 border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)]">Quick Demo Access</p>
                <button 
                  onClick={handleSeed}
                  disabled={seedStatus === 'loading'}
                  className={`text-[10px] font-medium font-bold  tracking-normal flex items-center gap-2 transition-all border border-slate-200 rounded-2xl px-3 py-2 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-sm ${
                    seedStatus === 'success' ? 'bg-[#10b981] text-slate-900' : 'bg-white text-slate-900 hover:bg-white/60 backdrop-blur-3xl'
                  }`}
                >
                  {seedStatus === 'loading' ? (
                    'Initializing...'
                  ) : seedStatus === 'success' ? (
                    <><Sparkles className="w-4 h-4" /> Ready!</>
                  ) : (
                    <><Database className="w-4 h-4" /> Initialize Database</>
                  )}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <button 
                  onClick={() => handleDemoLogin(UserRole.ADMIN)}
                  disabled={isLoading}
                  className="flex flex-col items-center justify-center gap-3 py-6 rounded-none border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 bg-white/60 backdrop-blur-3xl hover:bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all disabled:opacity-50"
                >
                  <ShieldCheck className="w-8 h-8 text-blue-500" />
                  <span className="text-[10px] font-medium font-bold  text-slate-900 tracking-normal">Owner Demo</span>
                </button>
                <button 
                  onClick={() => handleDemoLogin(UserRole.SALESPERSON)}
                  disabled={isLoading}
                  className="flex flex-col items-center justify-center gap-3 py-6 rounded-none border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 bg-white/60 backdrop-blur-3xl hover:bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all disabled:opacity-50"
                >
                  <UserIcon className="w-8 h-8 text-blue-500" />
                  <span className="text-[10px] font-medium font-bold  text-slate-900 tracking-normal">Sales Demo</span>
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
