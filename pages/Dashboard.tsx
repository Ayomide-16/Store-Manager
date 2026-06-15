import React, { useState, useMemo } from 'react';
import { useShop } from '../store';
import { UserRole, SaleStatus, PaymentMethod, Item } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { 
  TrendingUp, ShoppingBag, Wallet, CreditCard, AlertTriangle, 
  PlusCircle, History, MessageSquare, Package, X, ChevronRight, 
  Zap, CheckCircle, Clock, Plus, Banknote, ArrowRight, ShoppingCart, ShieldCheck, Sparkles, Database, BarChart3
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700/80 p-3 shadow-xl rounded-2xl text-left">
        <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{payload[0].payload.rawDate}</p>
        <p className="text-sm font-semibold text-white mt-1">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { currentUser, sales, items, saleItems, addSale, posFloats, posTransactions } = useShop();
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  
  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.saleDate === today && s.status === SaleStatus.COMPLETED);
  const activeFloat = posFloats.find(f => f.date === today && f.status === 'active');
  const posProfitToday = activeFloat?.totalChargesEarned || 0;

  const totalRevenue = todaySales.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const lowStockItems = items.filter(i => i.quantityInStock <= i.reorderLevel);

  const [showSeedConfirm, setShowSeedConfirm] = useState(false);

  // Compute 30-day historical daily revenue for business intelligence line chart
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const dailyRevenue = sales
        .filter(s => s.saleDate === dateString && s.status === SaleStatus.COMPLETED)
        .reduce((acc, s) => acc + (s.totalAmount || 0), 0);
        
      data.push({
        dateStr: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        revenue: dailyRevenue,
        rawDate: dateString,
      });
    }
    return data;
  }, [sales]);

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
        <div className={`p-6 border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex items-center gap-5 transition-transform ${activeFloat.currentBalance <= 0 ? 'bg-red-50' : 'bg-yellow-50'}`}>
          <div className={`w-14 h-14 border border-slate-200 rounded-2xl flex items-center justify-center shrink-0 animate-pulse shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${activeFloat.currentBalance <= 0 ? 'bg-red-500 text-white' : 'bg-yellow-400 text-slate-900'}`}>
             <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-medium font-bold text-xs  tracking-normal ${activeFloat.currentBalance <= 0 ? 'text-red-900' : 'text-yellow-900'}`}>
               POS Withdrawal Service - {activeFloat.currentBalance <= 0 ? 'CRITICAL' : 'REPLENISH NEEDED'}
            </p>
            <p className={`text-sm mt-1 font-bold truncate ${activeFloat.currentBalance <= 0 ? 'text-red-700' : 'text-yellow-800'}`}>
               The physical cash float is {formatCurrency(activeFloat.currentBalance)}. You cannot process more cash-outs without top-up.
            </p>
          </div>
          <button 
            onClick={() => onNavigate('pos-withdrawals')} 
            className={`px-6 py-3 border border-slate-200 rounded-2xl text-xs font-medium font-bold  tracking-normal transition-all transform active:scale-95 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-sm ${activeFloat.currentBalance <= 0 ? 'bg-red-500 text-white' : 'bg-yellow-400 text-slate-900'}`}
          >
             Fix Now
          </button>
        </div>
      )}

      {/* Blank Inventory Guidance */}
      {items.length === 0 && (
        <div className="bg-slate-900 p-8 text-white border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-transparent border-2 border-blue-200 flex items-center justify-center">
               <Database className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h3 className="text-3xl font-semibold tracking-tight font-bold tracking-tight">Blank Inventory</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Your database is empty. Initialize with demo products or upload a CSV.</p>
            </div>
          </div>
          <div className="flex gap-4">
             <button onClick={() => onNavigate('inventory')} className="px-6 py-3 bg-white text-slate-900 border-2 border-white font-medium font-bold text-xs  tracking-normal hover:bg-transparent hover:text-white transition-all btn-press">Go To Inventory</button>
             <button onClick={() => setShowSeedConfirm(true)} className="px-6 py-3 bg-transparent text-white border-2 border-slate-600 font-medium font-bold text-xs  tracking-normal hover:border-white transition-all btn-press">Help Me Set Up</button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight font-medium text-slate-900 tracking-tight mb-2">Welcome, {currentUser?.fullName}!</h1>
          <p className="text-slate-500 font-medium text-xs  tracking-normal">Shop status for {formatDate(new Date().toISOString())}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => onNavigate('sales-calculator')} className="bg-blue-600 border border-slate-200 rounded-2xl hover:bg-white hover:text-slate-900 text-white px-5 py-3 font-medium font-bold text-xs  tracking-normal shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:translate-y-0.5 transition-all flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> New Sale</button>
          <button onClick={() => onNavigate('pos-withdrawals')} className="bg-slate-900 border border-slate-200 rounded-2xl text-white hover:bg-transparent hover:text-slate-900 px-5 py-3 font-medium font-bold text-xs  tracking-normal shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:translate-y-0.5 transition-all flex items-center gap-2"><Banknote className="w-4 h-4" /> POS Withdrawal</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} onClick={stat.onClick} className="bg-white/60 backdrop-blur-3xl p-6 border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex items-center gap-5 transition-transform hover:-translate-y-1 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] cursor-pointer">
            <div className={`w-14 h-14 border border-slate-200 rounded-2xl ${stat.color.replace('bg-indigo-600', 'bg-blue-600').replace('bg-blue-600', 'bg-[#00E5FF]').replace('bg-rose-600', 'bg-[#FF0055]').replace('bg-purple-600', 'bg-[#AA00FF]')} flex items-center justify-center text-white shrink-0`}>
                <stat.icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
               <p className="text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-1 truncate">{stat.label}</p>
               <p className={`text-2xl font-semibold tracking-tight font-medium truncate ${stat.isAlert ? 'text-[#FF0055] animate-pulse' : 'text-slate-900'}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Action Navigation Section */}
      <div className="bg-white/60 backdrop-blur-3xl p-6 border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
        <h3 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
          Quick Operations Control
        </h3>
        <p className="text-slate-500 font-medium text-xs tracking-normal mb-6 mt-0.5">
          Accelerate your daily workflow with single-click actions for standard shop keeping operations.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => onNavigate('sales-calculator')}
            className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50/20 text-left transition-all hover:-translate-y-1 group"
          >
            <div className="w-12 h-12 bg-blue-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-950 text-sm">Record New Sale</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">Point of Sale Keypad</p>
            </div>
          </button>

          <button 
            onClick={() => onNavigate('inventory')}
            className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-300 hover:bg-emerald-50/20 text-left transition-all hover:-translate-y-1 group"
          >
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-950 text-sm">Add New Inventory</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">Product Registry & Logs</p>
            </div>
          </button>

          <button 
            onClick={() => onNavigate(isAdmin ? 'reports' : 'sales-history')}
            className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-2xl hover:border-purple-300 hover:bg-purple-50/20 text-left transition-all hover:-translate-y-1 group"
          >
            <div className="w-12 h-12 bg-purple-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-950 text-sm">
                {isAdmin ? 'View Business Reports' : 'View Ledger History'}
              </p>
              <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">Audits & Performance</p>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* POS Status Summary */}
          {!activeFloat && isAdmin && (
            <div onClick={() => onNavigate('pos-withdrawals')} className="bg-yellow-50 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 p-8 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex items-center justify-between cursor-pointer hover:-translate-y-1 transition-all group">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-900 text-white border border-slate-200 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><AlertTriangle className="w-8 h-8" /></div>
                <div>
                  <h4 className="text-2xl font-semibold tracking-tight font-medium text-slate-900 leading-tight mb-1">POS Float Not Started</h4>
                  <p className="text-slate-900 font-sans text-sm font-bold">Start today's cash withdrawal service to track earnings.</p>
                </div>
              </div>
              <ArrowRight className="w-8 h-8 text-slate-900 group-hover:translate-x-2 transition-transform" />
            </div>
          )}

          {/* Beautiful 30-Day Revenue Line Chart */}
          <div className="bg-white/60 backdrop-blur-3xl border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-semibold tracking-tight font-medium text-slate-900 tracking-tight flex items-center gap-2.5">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  30-Day Revenue Trend
                </h3>
                <p className="text-slate-500 font-medium text-xs tracking-normal mt-0.5">Daily shop sales overview for the past 30 days</p>
              </div>
              <div className="flex gap-4 shrink-0 bg-slate-50/80 border border-slate-100 p-3 rounded-2xl">
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider font-bold">30D Sum</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {formatCurrency(chartData.reduce((acc, d) => acc + d.revenue, 0))}
                  </p>
                </div>
                <div className="border-l border-slate-200 w-px self-stretch" />
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider font-bold">30D Avg</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {formatCurrency(chartData.reduce((acc, d) => acc + d.revenue, 0) / 30)}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.00}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="dateStr" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 550 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 550 }}
                    tickFormatter={(val) => `₦${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#2563eb" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#revenueGradient)"
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-3xl border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] overflow-hidden">
            <div className="p-6 border-b-2 border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-semibold tracking-tight font-medium text-slate-900 tracking-tight flex items-center gap-3">
                <History className="w-6 h-6 text-blue-500" />
                Recent Shop Sales
              </h3>
              <button onClick={() => onNavigate('sales-history')} className="text-[10px] font-medium font-bold text-slate-900 bg-white border border-slate-200 rounded-2xl px-4 py-2  tracking-normal hover:bg-slate-900 hover:text-white transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)]">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white text-xs font-medium font-bold text-slate-400  tracking-normal border-b-2 border-slate-200">
                  <tr><th className="px-6 py-4">Receipt</th><th className="px-6 py-4">Time</th><th className="px-6 py-4 text-right">Amount</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {todaySales.slice(0, 5).map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium font-bold text-slate-900">{sale.saleNumber}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm font-medium">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-6 py-4 font-medium font-bold text-slate-900 text-right">{formatCurrency(sale.totalAmount)}</td>
                    </tr>
                  ))}
                  {todaySales.length === 0 && (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-medium font-bold  text-xs tracking-normal">No sales logged today</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className={`p-8 border border-slate-200 rounded-2xl text-white shadow-[0_2px_10px_rgb(0,0,0,0.02)] relative overflow-hidden transition-all duration-500 ${posHealth.status === 'offline' ? 'bg-slate-900' : posHealth.status === 'critical' ? 'bg-[#FF0055]' : posHealth.status === 'warning' ? 'bg-[#FF9900]' : 'bg-blue-600'}`}>
              <h4 className="text-2xl font-semibold tracking-tight font-medium mb-8 flex items-center gap-3">
                 <ShieldCheck className="w-8 h-8" />
                 POS Status
              </h4>
              <div className="space-y-6">
                 <div className="flex justify-between items-center border-b border-white/20 pb-4">
                    <span className="text-[10px] font-medium font-bold text-white/70  tracking-normal">Cash in POS</span>
                    <span className={`font-medium text-xl font-medium ${activeFloat ? 'text-white' : 'text-white/50'}`}>
                       {activeFloat ? formatCurrency(activeFloat.currentBalance) : 'OFFLINE'}
                    </span>
                 </div>
                 <div className="flex justify-between items-center border-b border-white/20 pb-4">
                    <span className="text-[10px] font-medium font-bold text-white/70  tracking-normal">Today's Profit</span>
                    <span className="font-medium text-xl font-medium text-[#00FF66]">{formatCurrency(activeFloat?.totalChargesEarned || 0)}</span>
                 </div>
                 <div className="flex justify-between items-center pb-2">
                    <span className="text-[10px] font-medium font-bold text-white/70  tracking-normal">Health</span>
                    <span className="font-medium  text-xs font-bold tracking-normal px-2 py-1 bg-white text-slate-900 border border-slate-200 rounded-2xl">{posHealth.label}</span>
                 </div>
                 <button 
                  onClick={() => onNavigate('pos-withdrawals')}
                  className="w-full py-4 mt-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-medium font-bold text-[10px]  tracking-[0.2em] shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:translate-y-1 hover:shadow-none transition-all"
                 >
                    {activeFloat ? 'Manage Float' : 'Start Service'}
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Setup Confirmation Modal */}
      <ConfirmationModal 
        isOpen={showSeedConfirm}
        onClose={() => setShowSeedConfirm(false)}
        onConfirm={() => {
          setShowSeedConfirm(false);
          window.location.reload();
        }}
        title="Setup Assistant"
        message="To access the setup tools, we need to log you out and return to the login screen where the Initialize Database tool is located. Proceed?"
        confirmLabel="Go to Login"
        variant="info"
      />
    </div>
  );
};

export default Dashboard;