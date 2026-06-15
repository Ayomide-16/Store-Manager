
import React, { useMemo, useState } from 'react';
import { useShop } from '../store';
import { SaleStatus, PaymentMethod } from '../types';
// Removed non-existent export downloadCSV from utils
import { formatCurrency } from '../utils';
import { DailyTransactionsChart } from '../components/DailyTransactionsChart';
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
    <div className="space-y-12 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight font-medium text-slate-900 tracking-tight ">Business Analytics</h1>
          <p className="text-slate-500 font-medium text-sm  tracking-normal mt-2">Performance monitoring and trend analysis.</p>
        </div>
        <div className="flex gap-4">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-6 py-4 bg-white border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 font-medium font-bold text-slate-900 text-xs  tracking-normal focus:bg-white/60 backdrop-blur-3xl outline-none shadow-[0_2px_10px_rgb(0,0,0,0.02)] cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="all">All Time History</option>
          </select>
          <button onClick={() => window.print()} className="w-14 h-14 flex items-center justify-center bg-white border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 text-slate-900 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all">
             <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Daily Transaction Trend (D3 Line Chart) */}
      <DailyTransactionsChart />

      {/* NEW SECTION: POS WITHDRAWAL ANALYTICS */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col lg:flex-row">
         <div className="lg:w-1/3 p-10 bg-white/60 backdrop-blur-3xl border-b-4 lg:border-b-0 lg:border-r border-slate-100 space-y-8">
            <div>
               <div className="w-14 h-14 bg-blue-600 text-white border border-slate-200 rounded-2xl flex items-center justify-center mb-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                  <Banknote className="w-6 h-6" />
               </div>
               <h3 className="text-3xl font-semibold tracking-tight font-medium text-slate-900  tracking-tight">POS Business</h3>
               <p className="text-blue-500 text-xs font-medium font-bold  tracking-normal mt-2">Convenience Banking Insights</p>
            </div>

            <div className="space-y-6">
               <div className="bg-white p-6 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                  <p className="text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-2">Total Service Profit</p>
                  <p className="text-4xl font-semibold tracking-tight font-medium text-[#10b981] px-2 bg-slate-900 inline-block">{formatCurrency(posReportsData.totalCharges)}</p>
                  <div className="flex items-center gap-2 mt-4 text-[10px] font-medium font-bold  text-slate-900">
                     <TrendingUp className="w-4 h-4 text-[#10b981]" />
                     <span>{posReportsData.yield.toFixed(1)}% Yield on Volume</span>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                     <p className="text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-2">Requests</p>
                     <p className="text-3xl font-semibold tracking-tight font-medium text-slate-900">{posReportsData.txCount}</p>
                  </div>
                  <div className="bg-white p-6 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                     <p className="text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-2">Avg. Cash</p>
                     <p className="text-2xl font-semibold tracking-tight font-medium text-slate-900">{formatCurrency(posReportsData.avgWithdrawal)}</p>
                  </div>
               </div>
            </div>
         </div>

         <div className="flex-1 p-10 space-y-12">
            <div className="space-y-8">
               <div className="flex border-b border-slate-100 pb-4">
                  <h4 className="text-sm font-medium font-bold text-slate-900  tracking-normal">Volume Breakdown</h4>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                     <div className="flex justify-between items-end border-b-2 border-slate-200 pb-4">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl text-slate-900 flex items-center justify-center shadow-[0_2px_10px_rgb(0,0,0,0.02)]"><CreditCard className="w-6 h-6" /></div>
                           <div>
                              <p className="font-semibold tracking-tight font-medium text-slate-900 text-lg  tracking-tight">Card Payments</p>
                              <p className="text-[10px] font-medium font-bold  text-slate-500">{posReportsData.cardCount} Transactions</p>
                           </div>
                        </div>
                        <p className="font-semibold tracking-tight font-medium text-2xl text-slate-900">{formatCurrency(posReportsData.cardAmount)}</p>
                     </div>
                     <div className="h-4 bg-white/60 backdrop-blur-3xl border border-slate-200 rounded-2xl overflow-hidden p-0.5">
                        <div className="h-full bg-slate-900 transition-all duration-1000" style={{ width: `${Math.max(posReportsData.cardPercent, 2)}%` }}></div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="flex justify-between items-end border-b-2 border-slate-200 pb-4">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl text-slate-900 flex items-center justify-center shadow-[0_2px_10px_rgb(0,0,0,0.02)]"><ArrowLeftRight className="w-6 h-6" /></div>
                           <div>
                              <p className="font-semibold tracking-tight font-medium text-slate-900 text-lg  tracking-tight">Bank Transfers</p>
                              <p className="text-[10px] font-medium font-bold  text-slate-500">{posReportsData.transferCount} Transactions</p>
                           </div>
                        </div>
                        <p className="font-semibold tracking-tight font-medium text-2xl text-slate-900">{formatCurrency(posReportsData.transferAmount)}</p>
                     </div>
                     <div className="h-4 bg-white/60 backdrop-blur-3xl border border-slate-200 rounded-2xl overflow-hidden p-0.5">
                        <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${Math.max(posReportsData.transferPercent, 2)}%` }}></div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="pt-8 space-y-6">
               <div className="flex border-b border-slate-100 pb-4">
                  <h4 className="text-sm font-medium font-bold text-slate-900  tracking-normal">Withdrawal Liquidity Flow</h4>
               </div>
               <div className="bg-slate-900 p-10 border border-slate-200 rounded-[2rem] shadow-sm text-white flex flex-col md:flex-row justify-between gap-10 relative overflow-hidden">
                  <div className="relative z-10">
                     <p className="text-[#10b981] text-[10px] font-medium font-bold  tracking-normal mb-3">Total Cash Disbursed</p>
                     <p className="text-5xl font-semibold tracking-tight font-medium tracking-tight mb-2">{formatCurrency(posReportsData.totalVolume)}</p>
                     <p className="text-white/40 font-medium text-[10px] ">Cash converted into bank balance</p>
                  </div>
                  <div className="bg-blue-600 p-6 border border-slate-200 rounded-2xl flex-1 max-w-xs self-center shadow-[0_2px_10px_rgb(0,0,0,0.02)] relative z-10">
                     <p className="text-black text-[10px] font-medium font-bold  tracking-normal mb-4">Profitability Marker</p>
                     <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-white text-slate-900 border border-slate-200 rounded-2xl rounded-none flex items-center justify-center font-semibold tracking-tight font-medium text-xl shadow-[0_2px_10px_rgb(0,0,0,0.02)]">7.2x</div>
                        <p className="text-xs font-medium font-bold text-white  leading-relaxed">Avg return multiplier vs traditional banking</p>
                     </div>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#10b981]/10 rounded-full blur-3xl -translate-y-10 translate-x-20"></div>
               </div>
            </div>
         </div>
      </div>

      {/* STANDARD SHOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Core Shop Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-white', bg: 'bg-slate-900' },
          { label: 'Standard Net Profit', value: formatCurrency(totalProfit), icon: TrendingUp, color: 'text-slate-900', bg: 'bg-[#10b981]' },
          { label: 'Current Inventory Value', value: formatCurrency(totalStockValue), icon: Package, color: 'text-white', bg: 'bg-blue-600' },
          { label: 'Average Order Value', value: formatCurrency(totalRevenue / (completedSales.length || 1)), icon: ShoppingBag, color: 'text-slate-900', bg: 'bg-white' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col hover:translate-y-[-4px] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
            <div className={`w-14 h-14 ${stat.bg} ${stat.color} border border-slate-200 rounded-2xl flex items-center justify-center mb-8 shadow-[0_2px_10px_rgb(0,0,0,0.02)]`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-2 border-b-2 border-slate-200 pb-2">{stat.label}</p>
            <p className="text-3xl font-semibold tracking-tight font-medium text-slate-900 tracking-tight truncate">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reports;
