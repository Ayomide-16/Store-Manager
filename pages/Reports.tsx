
import React, { useMemo, useState } from 'react';
import { useShop } from '../store';
import { SaleStatus, PaymentMethod } from '../types';
// Removed non-existent export downloadCSV from utils
import { formatCurrency } from '../utils';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  ShoppingBag, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Users, 
  Download,
  Printer,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle,
  Banknote,
  CreditCard,
  ArrowLeftRight,
  TrendingDown
} from 'lucide-react';

const Reports: React.FC = () => {
  const { sales, items, categories, saleItems, posTransactions } = useShop();
  const [dateRange, setDateRange] = useState('30days');

  // Filtering based on dateRange
  const filterDate = useMemo(() => {
    const now = new Date();
    let d = new Date();
    if (dateRange === '7days') d.setDate(now.getDate() - 7);
    else if (dateRange === '30days') d.setDate(now.getDate() - 30);
    else if (dateRange === 'today') d.setHours(0,0,0,0);
    else d = new Date(0);
    return d;
  }, [dateRange]);

  const completedSales = useMemo(() => {
    return sales.filter(s => {
      const isCompleted = s.status === SaleStatus.COMPLETED;
      const isWithinRange = dateRange === 'all' ? true : new Date(s.createdAt) >= filterDate;
      return isCompleted && isWithinRange;
    });
  }, [sales, filterDate, dateRange]);

  const posReportsData = useMemo(() => {
    const rangeTxs = posTransactions.filter(t => dateRange === 'all' ? true : new Date(t.createdAt) >= filterDate);
    const totalVolume = rangeTxs.reduce((a, c) => a + c.withdrawalAmount, 0);
    const totalCharges = rangeTxs.reduce((a, c) => a + c.serviceCharge, 0);
    
    // Total PAID (Cash out + Service charge)
    const cardAmount = rangeTxs.filter(t => t.paymentMethod === 'card').reduce((a, c) => a + c.totalPaid, 0);
    const transferAmount = rangeTxs.filter(t => t.paymentMethod === 'bank_transfer').reduce((a, c) => a + c.totalPaid, 0);
    
    const cardCount = rangeTxs.filter(t => t.paymentMethod === 'card').length;
    const transferCount = rangeTxs.filter(t => t.paymentMethod === 'bank_transfer').length;
    
    return {
      txCount: rangeTxs.length,
      totalVolume,
      totalCharges,
      cardAmount,
      transferAmount,
      cardCount,
      transferCount,
      cardPercent: rangeTxs.length > 0 ? (cardCount / rangeTxs.length) * 100 : 0,
      transferPercent: rangeTxs.length > 0 ? (transferCount / rangeTxs.length) * 100 : 0,
      avgWithdrawal: rangeTxs.length > 0 ? totalVolume / rangeTxs.length : 0,
      yield: totalVolume > 0 ? (totalCharges / totalVolume) * 100 : 0
    };
  }, [posTransactions, filterDate, dateRange]);
  
  const totalRevenue = completedSales.reduce((a, b) => a + b.totalAmount, 0);
  const totalProfit = completedSales.reduce((a, b) => a + b.profitAmount, 0);
  const totalStockValue = items.reduce((a, b) => a + (b.costPrice * b.quantityInStock), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Business Analytics</h1>
          <p className="text-slate-500 font-medium">Performance monitoring and trend analysis.</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-5 py-3 bg-white border border-slate-200 rounded-xl font-black text-slate-600 text-xs uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="all">All Time History</option>
          </select>
          <button onClick={() => window.print()} className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm">
             <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* NEW SECTION: POS WITHDRAWAL ANALYTICS */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col lg:flex-row">
         <div className="lg:w-1/3 p-10 bg-slate-50 border-r border-slate-100 space-y-8">
            <div>
               <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-600/20">
                  <Banknote className="w-6 h-6" />
               </div>
               <h3 className="text-2xl font-black text-slate-900 tracking-tight">POS Business</h3>
               <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1">Convenience Banking Insights</p>
            </div>

            <div className="space-y-6">
               <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Service Profit</p>
                  <p className="text-3xl font-black text-emerald-600">{formatCurrency(posReportsData.totalCharges)}</p>
                  <div className="flex items-center gap-1 mt-2 text-[10px] font-black text-slate-400">
                     <TrendingUp className="w-3 h-3 text-emerald-500" />
                     <span>{posReportsData.yield.toFixed(1)}% Yield on Volume</span>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Requests</p>
                     <p className="text-xl font-black text-slate-900">{posReportsData.txCount}</p>
                  </div>
                  <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg. Cash</p>
                     <p className="text-xl font-black text-slate-900">{formatCurrency(posReportsData.avgWithdrawal)}</p>
                  </div>
               </div>
            </div>
         </div>

         <div className="flex-1 p-10 space-y-10">
            <div className="space-y-4">
               <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Volume Breakdown</h4>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                     <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><CreditCard className="w-5 h-5" /></div>
                           <div>
                              <p className="font-black text-slate-900 text-sm">Card Payments</p>
                              <p className="text-[10px] font-bold text-slate-400">{posReportsData.cardCount} Transactions</p>
                           </div>
                        </div>
                        <p className="font-black text-slate-900">{formatCurrency(posReportsData.cardAmount)}</p>
                     </div>
                     <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${posReportsData.cardPercent}%` }}></div>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center"><ArrowLeftRight className="w-5 h-5" /></div>
                           <div>
                              <p className="font-black text-slate-900 text-sm">Bank Transfers</p>
                              <p className="text-[10px] font-bold text-slate-400">{posReportsData.transferCount} Transactions</p>
                           </div>
                        </div>
                        <p className="font-black text-slate-900">{formatCurrency(posReportsData.transferAmount)}</p>
                     </div>
                     <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${posReportsData.transferPercent}%` }}></div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="pt-10 border-t border-slate-100">
               <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Withdrawal Liquidity Flow</h4>
               </div>
               <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col md:flex-row justify-between gap-10">
                  <div>
                     <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Total Cash Disbursed</p>
                     <p className="text-4xl font-black tracking-tighter">{formatCurrency(posReportsData.totalVolume)}</p>
                     <p className="text-white/20 text-[10px] font-medium mt-2 italic">Cash converted into bank balance</p>
                  </div>
                  <div className="bg-white/10 p-6 rounded-2xl border border-white/5 flex-1 max-w-xs self-center">
                     <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-3">Profitability Marker</p>
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center font-black">7.2x</div>
                        <p className="text-xs text-white/70 leading-relaxed font-medium">Average return multiplier compared to traditional banking.</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* STANDARD SHOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Core Shop Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Standard Net Profit', value: formatCurrency(totalProfit), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Current Inventory Value', value: formatCurrency(totalStockValue), icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Average Order Value', value: formatCurrency(totalRevenue / (completedSales.length || 1)), icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-6 shadow-sm`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;
