import React, { useState, useMemo } from 'react';
import { useShop } from '../store';
import { UserRole, SaleStatus, PaymentMethod, Item } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { 
  TrendingUp, ShoppingBag, Wallet, CreditCard, AlertTriangle, 
  PlusCircle, History, MessageSquare, Package, X, ChevronRight, 
  Zap, CheckCircle, Clock, Plus, Banknote, ArrowRight, ShoppingCart, ShieldCheck, Sparkles, Database
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { currentUser, sales, items, saleItems, addSale, posFloats, posTransactions } = useShop();
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  
  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.saleDate === today && s.status === SaleStatus.COMPLETED);
  const activeFloat = posFloats.find(f => f.date === today && f.status === 'active');
  const posProfitToday = activeFloat?.totalChargesEarned || 0;

  const totalRevenue = todaySales.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const lowStockItems = items.filter(i => i.quantityInStock <= i.reorderLevel);

  const posHealth = useMemo(() => {
    if (!activeFloat) return { label: 'Not Started', color: 'bg-slate-400', textColor: 'text-slate-600', status: 'offline' };
    if (activeFloat.currentBalance <= 0) return { label: 'Depleted', color: 'bg-rose-600', textColor: 'text-rose-600', status: 'critical' };
    if (activeFloat.currentBalance < 10000) return { label: 'Low', color: 'bg-amber-500', textColor: 'text-amber-600', status: 'warning' };
    return { label: 'Healthy', color: 'bg-emerald-600', textColor: 'text-emerald-600', status: 'good' };
  }, [activeFloat]);

  const stats = [
    { label: "Today's Shop Revenue", value: formatCurrency(totalRevenue), icon: TrendingUp, color: 'bg-indigo-600', onClick: () => onNavigate('sales-history') },
    { label: "Transactions Today", value: todaySales.length.toString(), icon: ShoppingBag, color: 'bg-blue-600', onClick: () => onNavigate('sales-history') },
    { label: "Stock Alerts", value: lowStockItems.length.toString(), icon: AlertTriangle, color: 'bg-rose-600', isAlert: lowStockItems.length > 0, onClick: () => onNavigate('inventory') },
    { label: "POS Profit", value: formatCurrency(posProfitToday), icon: Wallet, color: 'bg-purple-600' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Real-time alerts for critical POS status */}
      {activeFloat && activeFloat.currentBalance < 10000 && (
        <div className={`p-5 rounded-2xl flex items-center gap-5 border-2 shadow-sm animate-in slide-in-from-top duration-500 ${activeFloat.currentBalance <= 0 ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 animate-pulse shadow-md ${activeFloat.currentBalance <= 0 ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'}`}>
             <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-black text-sm uppercase tracking-widest ${activeFloat.currentBalance <= 0 ? 'text-rose-900' : 'text-amber-900'}`}>
               POS Withdrawal Service - {activeFloat.currentBalance <= 0 ? 'CRITICAL' : 'REPLENISH NEEDED'}
            </p>
            <p className={`text-xs font-bold truncate ${activeFloat.currentBalance <= 0 ? 'text-rose-700' : 'text-amber-700'}`}>
               The physical cash float is {formatCurrency(activeFloat.currentBalance)}. You cannot process more cash-outs without top-up.
            </p>
          </div>
          <button 
            onClick={() => onNavigate('pos-withdrawals')} 
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all transform active:scale-95 ${activeFloat.currentBalance <= 0 ? 'bg-rose-600 text-white shadow-rose-600/20' : 'bg-amber-600 text-white shadow-amber-600/20'}`}
          >
             Fix Now
          </button>
        </div>
      )}

      {/* Blank Inventory Guidance */}
      {items.length === 0 && (
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-indigo-600/20">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-inner">
               <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight">Blank Inventory</h3>
              <p className="text-indigo-100 text-sm font-medium">Your database is empty. Initialize with demo products or upload a CSV.</p>
            </div>
          </div>
          <div className="flex gap-3">
             <button onClick={() => onNavigate('inventory')} className="px-6 py-3 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg active:scale-95">Go To Inventory</button>
             <button onClick={() => { if(confirm("Log out to use the 'Initialize Database' tool on the login screen?")) { window.location.reload(); } }} className="px-6 py-3 bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-400 transition-all border border-indigo-400 shadow-lg active:scale-95">Help Me Set Up</button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome, {currentUser?.fullName}!</h1>
          <p className="text-slate-500 font-medium">Shop status for {formatDate(new Date().toISOString())}.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onNavigate('sales-calculator')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 transform active:scale-95"><ShoppingCart className="w-4 h-4" /> New Sale</button>
          <button onClick={() => onNavigate('pos-withdrawals')} className="bg-slate-900 hover:bg-black text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 transform active:scale-95"><Banknote className="w-4 h-4" /> POS Withdrawal</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} onClick={stat.onClick} className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 transition-all ${stat.onClick ? 'cursor-pointer hover:shadow-md hover:border-indigo-100 active:scale-95' : 'cursor-default'}`}>
            <div className={`w-12 h-12 rounded-2xl ${stat.color} flex items-center justify-center text-white shrink-0 shadow-lg shadow-current/10`}><stat.icon className="w-5 h-5" /></div>
            <div className="min-w-0">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate">{stat.label}</p>
               <p className={`text-xl font-black truncate ${stat.isAlert ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* POS Status Summary */}
          {!activeFloat && isAdmin && (
            <div onClick={() => onNavigate('pos-withdrawals')} className="bg-amber-50 border-2 border-dashed border-amber-200 p-8 rounded-[2.5rem] flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-all group">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white text-amber-500 rounded-3xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><AlertTriangle className="w-8 h-8" /></div>
                <div>
                  <h4 className="text-xl font-black text-amber-900 leading-tight">POS Float Not Started</h4>
                  <p className="text-amber-700 text-sm font-medium">Start today's cash withdrawal service to track earnings.</p>
                </div>
              </div>
              <ArrowRight className="w-8 h-8 text-amber-300 group-hover:translate-x-2 transition-transform" />
            </div>
          )}

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <History className="w-6 h-6 text-indigo-500" />
                Recent Shop Sales
              </h3>
              <button onClick={() => onNavigate('sales-history')} className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr><th className="px-8 py-4">Receipt</th><th className="px-8 py-4">Time</th><th className="px-8 py-4">Amount</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todaySales.slice(0, 5).map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4 font-black text-slate-900">{sale.saleNumber}</td>
                      <td className="px-8 py-4 text-slate-500 text-sm font-bold">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-8 py-4 font-black text-slate-900">{formatCurrency(sale.totalAmount)}</td>
                    </tr>
                  ))}
                  {todaySales.length === 0 && (
                    <tr><td colSpan={3} className="px-8 py-12 text-center text-slate-300 font-bold uppercase text-xs tracking-widest">No sales logged today</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className={`p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group transition-all duration-500 ${posHealth.status === 'offline' ? 'bg-slate-900' : posHealth.status === 'critical' ? 'bg-rose-600' : posHealth.status === 'warning' ? 'bg-amber-500' : 'bg-indigo-900'}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-16 -translate-y-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <h4 className="text-xl font-black mb-6 flex items-center gap-3">
                 <ShieldCheck className="w-6 h-6 text-white/80" />
                 POS Status
              </h4>
              <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Cash in POS</span>
                    <span className={`font-black ${activeFloat ? (activeFloat.currentBalance < 10000 ? 'text-white underline decoration-wavy' : 'text-white') : 'text-slate-700'}`}>
                       {activeFloat ? formatCurrency(activeFloat.currentBalance) : 'OFFLINE'}
                    </span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Today's Profit</span>
                    <span className="font-black text-emerald-300">{formatCurrency(activeFloat?.totalChargesEarned || 0)}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Health</span>
                    <span className="font-black uppercase text-[10px] tracking-widest px-2 py-1 bg-white/20 rounded">{posHealth.label}</span>
                 </div>
                 <button 
                  onClick={() => onNavigate('pos-withdrawals')}
                  className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-white/90 transition-all transform active:scale-95"
                 >
                    {activeFloat ? 'Manage Float' : 'Start Service'}
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;