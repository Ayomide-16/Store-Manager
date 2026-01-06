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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Closing Accounts</h1>
          <p className="text-slate-500 font-medium">Synchronize physical cash and bank statements with system records.</p>
        </div>
        <div className="flex gap-2 no-print">
          <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 shadow-sm flex items-center gap-2"><Printer className="w-4 h-4" /> Export PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 flex flex-col">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Shop Cash Drawer</h3>
          </div>
          <div className="space-y-4 flex-1">
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>Expected Cash</span>
              <span className="text-slate-900">{formatCurrency(stats.cashExpected)}</span>
            </div>
            <input 
              type="number" 
              placeholder="Physical Count" 
              className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-xl font-black outline-none focus:ring-2 focus:ring-indigo-500" 
              value={actualCash} 
              onFocus={e => e.target.select()}
              onChange={e => setActualCash(e.target.value)} 
            />
            {cashVariance !== null && (
              <div className={`p-4 rounded-xl flex justify-between items-center animate-in zoom-in duration-300 ${cashVariance === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                <span className="text-[10px] font-black uppercase">Discrepancy</span>
                <span className="font-black">{cashVariance === 0 ? 'BALANCED' : formatCurrency(cashVariance)}</span>
              </div>
            )}
            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
               <p className="flex justify-between text-[9px] font-bold text-slate-400 uppercase"><span>Sales Cash (+)</span><span className="text-emerald-600">+{formatCurrency(stats.cashSales)}</span></p>
               <p className="flex justify-between text-[9px] font-bold text-slate-400 uppercase"><span>Moved to POS (-)</span><span className="text-rose-600">-{formatCurrency(stats.posTransferOut)}</span></p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 flex flex-col">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Consolidated Bank</h3>
          </div>
          <div className="space-y-4 flex-1">
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>Expected Stmt</span>
              <span className="text-slate-900">{formatCurrency(stats.bankExpected)}</span>
            </div>
            <input 
              type="number" 
              placeholder="Current Statement Balance" 
              className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-xl font-black outline-none focus:ring-2 focus:ring-indigo-500" 
              value={actualBank} 
              onFocus={e => e.target.select()}
              onChange={e => setActualBank(e.target.value)} 
            />
            {bankVariance !== null && (
              <div className={`p-4 rounded-xl flex justify-between items-center animate-in zoom-in duration-300 ${bankVariance === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                <span className="text-[10px] font-black uppercase">Discrepancy</span>
                <span className="font-black">{bankVariance === 0 ? 'BALANCED' : formatCurrency(bankVariance)}</span>
              </div>
            )}
            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
               <p className="flex justify-between text-[9px] font-bold text-slate-400 uppercase"><span>Shop Sales (+)</span><span className="text-indigo-600">+{formatCurrency(stats.bankSales)}</span></p>
               <p className="flex justify-between text-[9px] font-bold text-slate-400 uppercase"><span>POS Receipts (+)</span><span className="text-indigo-600">+{formatCurrency(stats.posReceivedInBank)}</span></p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 flex flex-col">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 uppercase text-[10px] tracking-widest">POS Cash Float</h3>
          </div>
          <div className="space-y-4 flex-1">
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>Expected Float</span>
              <span className="text-slate-900">{formatCurrency(stats.posFloatExpected)}</span>
            </div>
            <input 
              type="number" 
              placeholder="Actual POS Cash" 
              className="w-full px-6 py-4 bg-slate-50 rounded-2xl text-xl font-black outline-none focus:ring-2 focus:ring-indigo-500" 
              value={actualPOS} 
              onFocus={e => e.target.select()}
              onChange={e => setActualPOS(e.target.value)} 
            />
            {posVariance !== null && (
              <div className={`p-4 rounded-xl flex justify-between items-center animate-in zoom-in duration-300 ${posVariance === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                <span className="text-[10px] font-black uppercase">Discrepancy</span>
                <span className="font-black">{posVariance === 0 ? 'BALANCED' : formatCurrency(posVariance)}</span>
              </div>
            )}
            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
               <p className="flex justify-between text-[9px] font-bold text-slate-400 uppercase"><span>Float Start (+)</span><span className="text-slate-600">{formatCurrency(activeFloat?.openingBalance || 0)}</span></p>
               <p className="flex justify-between text-[9px] font-bold text-slate-400 uppercase"><span>Replenishments (+)</span><span className="text-emerald-600">+{formatCurrency(stats.posTransfersIn - (activeFloat?.openingBalance || 0))}</span></p>
               <p className="flex justify-between text-[9px] font-bold text-slate-400 uppercase"><span>Cash Given (-)</span><span className="text-rose-600">-{formatCurrency(stats.posTotalDisbursed)}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reconciliation;