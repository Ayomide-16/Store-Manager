import React, { useState, useMemo } from 'react';
import { useShop } from '../store';
import { PaymentMethod, SaleStatus, Item } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { Scale, Wallet, CheckCircle, CreditCard, AlertTriangle, Printer, Package, ChevronRight, ClipboardCheck, Search, ArrowLeft, RefreshCw, Download, FileText, Banknote, ArrowRightLeft, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const Reconciliation: React.FC = () => {
  const { sales, items, posFloats, posTransactions, posTransfers } = useShop();
  
  const [actualCash, setActualCash] = useState<string>('');
  const [actualBank, setActualBank] = useState<string>('');
  const [actualPOS, setActualPOS] = useState<string>('');
  
  const today = new Date().toISOString().split('T')[0];
  const activeFloat = posFloats.find(f => f.date === today && f.status === 'active');
  const todaySales = sales.filter(s => s.saleDate === today && s.status === SaleStatus.COMPLETED);

  const stats = useMemo(() => {
    const cashSales = todaySales.filter(s => s.paymentMethod === PaymentMethod.CASH).reduce((a, c) => a + c.totalAmount, 0);
    const posTransferOut = posTransfers.filter(t => t.source === 'shop_cash' && t.floatId === activeFloat?.id).reduce((a, c) => a + c.amount, 0);
    const cashExpected = Math.max(0, cashSales - posTransferOut); 
    
    const bankSales = todaySales.filter(s => s.paymentMethod !== PaymentMethod.CASH).reduce((a, c) => a + c.totalAmount, 0);
    const posReceivedInBank = posTransactions.filter(tx => activeFloat && tx.floatId === activeFloat.id).reduce((a, c) => a + c.totalPaid, 0);
    const bankExpected = bankSales + posReceivedInBank;

    const posFloatExpected = activeFloat?.currentBalance || 0;
    const posTransfersIn = posTransfers.filter(t => t.floatId === activeFloat?.id).reduce((a, c) => a + c.amount, 0);
    const posTotalDisbursed = posTransactions.filter(t => t.floatId === activeFloat?.id).reduce((a, c) => a + c.withdrawalAmount, 0);

    return { 
      cashSales,
      cashExpected, 
      bankSales,
      bankExpected, 
      posReceivedInBank,
      posTransferOut,
      posFloatExpected,
      posTransfersIn,
      posTotalDisbursed
    };
  }, [todaySales, posTransfers, posTransactions, activeFloat]);

  const cashVariance = actualCash ? Number(actualCash) - stats.cashExpected : null;
  const bankVariance = actualBank ? Number(actualBank) - stats.bankExpected : null;
  const posVariance = actualPOS ? Number(actualPOS) - stats.posFloatExpected : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight font-medium text-slate-900 tracking-tight ">Closing Accounts</h1>
          <p className="text-slate-500 font-medium text-sm  tracking-normal mt-2">Synchronize physical cash and bank statements with system records.</p>
        </div>
        <div className="flex gap-4 no-print">
          <button onClick={() => window.print()} className="px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 font-medium font-bold text-xs  tracking-normal shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all flex items-center gap-3"><Printer className="w-5 h-5" /> Export PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-8 flex flex-col">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-400 border border-slate-200 rounded-2xl text-slate-900 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="font-semibold tracking-tight font-medium text-slate-900 text-xl  tracking-tight">Shop Cash</h3>
          </div>
          <div className="space-y-6 flex-1">
            <div className="flex flex-col gap-1 border-b-2 border-slate-200 pb-4">
              <span className="text-[10px] font-medium font-bold text-slate-500  tracking-normal">Expected Cash</span>
              <span className="text-3xl font-semibold tracking-tight font-medium text-slate-900">{formatCurrency(stats.cashExpected)}</span>
            </div>
            <input 
              type="number" 
              placeholder="Physical Count" 
              className="w-full px-6 py-5 bg-white/60 backdrop-blur-3xl border border-slate-200 rounded-2xl text-2xl font-semibold tracking-tight font-medium outline-none focus:bg-white transition-all text-center placeholder:text-slate-300" 
              value={actualCash} 
              onFocus={e => e.target.select()}
              onChange={e => setActualCash(e.target.value)} 
            />
            {cashVariance !== null && (
              <div className={`p-5 border-2 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex justify-between items-center animate-in zoom-in duration-300 ${cashVariance === 0 ? 'bg-[#10b981] border-slate-200 text-slate-900' : 'bg-red-600 border-slate-200 text-white'}`}>
                <span className="text-[10px] font-medium font-bold  tracking-normal">Discrepancy</span>
                <span className="font-semibold tracking-tight font-medium text-xl">{cashVariance === 0 ? 'BALANCED' : formatCurrency(cashVariance)}</span>
              </div>
            )}
            <div className="bg-white/60 backdrop-blur-3xl p-5 border border-slate-200 rounded-2xl space-y-3">
               <p className="flex justify-between items-end text-[10px] font-medium font-bold  tracking-normal"><span className="text-slate-500">Sales Cash (+)</span><span className="text-xl font-semibold tracking-tight font-medium text-slate-900 leading-none">{formatCurrency(stats.cashSales)}</span></p>
               <p className="flex justify-between items-end text-[10px] font-medium font-bold  tracking-normal"><span className="text-slate-500">Moved to POS (-)</span><span className="text-xl font-semibold tracking-tight font-medium text-red-600 leading-none">{formatCurrency(stats.posTransferOut)}</span></p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-8 flex flex-col">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-400 border border-slate-200 rounded-2xl text-slate-900 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="font-semibold tracking-tight font-medium text-slate-900 text-xl  tracking-tight">Consolidated Bank</h3>
          </div>
          <div className="space-y-6 flex-1">
            <div className="flex flex-col gap-1 border-b-2 border-slate-200 pb-4">
              <span className="text-[10px] font-medium font-bold text-slate-500  tracking-normal">Expected Stmt</span>
              <span className="text-3xl font-semibold tracking-tight font-medium text-slate-900">{formatCurrency(stats.bankExpected)}</span>
            </div>
            <input 
              type="number" 
              placeholder="Statement Balance" 
              className="w-full px-6 py-5 bg-white/60 backdrop-blur-3xl border border-slate-200 rounded-2xl text-2xl font-semibold tracking-tight font-medium outline-none focus:bg-white transition-all text-center placeholder:text-slate-300" 
              value={actualBank} 
              onFocus={e => e.target.select()}
              onChange={e => setActualBank(e.target.value)} 
            />
            {bankVariance !== null && (
              <div className={`p-5 border-2 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex justify-between items-center animate-in zoom-in duration-300 ${bankVariance === 0 ? 'bg-[#10b981] border-slate-200 text-slate-900' : 'bg-red-600 border-slate-200 text-white'}`}>
                <span className="text-[10px] font-medium font-bold  tracking-normal">Discrepancy</span>
                <span className="font-semibold tracking-tight font-medium text-xl">{bankVariance === 0 ? 'BALANCED' : formatCurrency(bankVariance)}</span>
              </div>
            )}
            <div className="bg-white/60 backdrop-blur-3xl p-5 border border-slate-200 rounded-2xl space-y-3">
               <p className="flex justify-between items-end text-[10px] font-medium font-bold  tracking-normal"><span className="text-slate-500">Shop Sales (+)</span><span className="text-xl font-semibold tracking-tight font-medium text-slate-900 leading-none">{formatCurrency(stats.bankSales)}</span></p>
               <p className="flex justify-between items-end text-[10px] font-medium font-bold  tracking-normal"><span className="text-slate-500">POS Receipts (+)</span><span className="text-xl font-semibold tracking-tight font-medium text-slate-900 leading-none">{formatCurrency(stats.posReceivedInBank)}</span></p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-8 flex flex-col">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 text-white border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex items-center justify-center">
              <Banknote className="w-6 h-6" />
            </div>
            <h3 className="font-semibold tracking-tight font-medium text-slate-900 text-xl  tracking-tight">POS Cash Float</h3>
          </div>
          <div className="space-y-6 flex-1">
            <div className="flex flex-col gap-1 border-b-2 border-slate-200 pb-4">
              <span className="text-[10px] font-medium font-bold text-slate-500  tracking-normal">Expected Float</span>
              <span className="text-3xl font-semibold tracking-tight font-medium text-slate-900">{formatCurrency(stats.posFloatExpected)}</span>
            </div>
            <input 
              type="number" 
              placeholder="Actual POS Cash" 
              className="w-full px-6 py-5 bg-white/60 backdrop-blur-3xl border border-slate-200 rounded-2xl text-2xl font-semibold tracking-tight font-medium outline-none focus:bg-white transition-all text-center placeholder:text-slate-300" 
              value={actualPOS} 
              onFocus={e => e.target.select()}
              onChange={e => setActualPOS(e.target.value)} 
            />
            {posVariance !== null && (
              <div className={`p-5 border-2 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex justify-between items-center animate-in zoom-in duration-300 ${posVariance === 0 ? 'bg-[#10b981] border-slate-200 text-slate-900' : 'bg-red-600 border-slate-200 text-white'}`}>
                <span className="text-[10px] font-medium font-bold  tracking-normal">Discrepancy</span>
                <span className="font-semibold tracking-tight font-medium text-xl">{posVariance === 0 ? 'BALANCED' : formatCurrency(posVariance)}</span>
              </div>
            )}
            <div className="bg-white/60 backdrop-blur-3xl p-5 border border-slate-200 rounded-2xl space-y-3">
               <p className="flex justify-between items-end text-[10px] font-medium font-bold  tracking-normal"><span className="text-slate-500">Float Start (+)</span><span className="text-xl font-semibold tracking-tight font-medium text-slate-900 leading-none">{formatCurrency(activeFloat?.openingBalance || 0)}</span></p>
               <p className="flex justify-between items-end text-[10px] font-medium font-bold  tracking-normal"><span className="text-slate-500">Replenishments (+)</span><span className="text-xl font-semibold tracking-tight font-medium text-[#10b981] leading-none px-1 bg-slate-900">{formatCurrency(stats.posTransfersIn - (activeFloat?.openingBalance || 0))}</span></p>
               <p className="flex justify-between items-end text-[10px] font-medium font-bold  tracking-normal"><span className="text-slate-500">Cash Given (-)</span><span className="text-xl font-semibold tracking-tight font-medium text-red-600 leading-none">{formatCurrency(stats.posTotalDisbursed)}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reconciliation;