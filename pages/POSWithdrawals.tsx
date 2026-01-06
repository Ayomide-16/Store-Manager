import React, { useState, useMemo, useEffect } from 'react';
import { useShop } from '../store';
import { UserRole, PaymentMethod, POSChargeTier } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../utils';
import { 
  Banknote, Plus, Wallet, AlertTriangle, ArrowUpRight, 
  History, User, CheckCircle, CreditCard, ChevronRight, 
  X, Settings, RefreshCw, Zap, Minus, ArrowLeftRight, Trash2, ShieldCheck, PlusCircle, Edit2, Eraser
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';

const POSWithdrawals: React.FC = () => {
  const { 
    currentUser, posFloats, posTransactions, posTransfers, posChargeTiers,
    startPOSFloat, addPOSTransaction, addPOSTransfer, closePOSFloat, deletePOSTransaction, 
    addPOSChargeTier, updatePOSChargeTier, deletePOSChargeTier, resetPOSTiersToDefault, 
    clearPOSTiers, triggerAlert
  } = useShop();

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const today = new Date().toISOString().split('T')[0];
  const activeFloat = posFloats.find(f => f.status === 'active' && f.date === today);
  
  const [formData, setFormData] = useState({
    customerName: '',
    withdrawalAmount: 0,
    serviceCharge: 0,
    paymentMethod: 'card' as 'card' | 'bank_transfer'
  });

  const [tierFormData, setTierFormData] = useState({
    id: '',
    minAmount: 0,
    maxAmount: 0,
    chargeAmount: 0
  });

  const [showStartModal, setShowStartModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSource, setTransferSource] = useState<'shop_cash' | 'external'>('shop_cash');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showTiersModal, setShowTiersModal] = useState(false);
  const [showAddTierModal, setShowAddTierModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const amount = formData.withdrawalAmount;
    const tier = posChargeTiers.find(t => t.isActive && amount >= t.minAmount && amount <= t.maxAmount);
    if (tier) {
      setFormData(prev => ({ ...prev, serviceCharge: tier.chargeAmount }));
    }
  }, [formData.withdrawalAmount, posChargeTiers]);

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const txNum = await addPOSTransaction(formData);
      setShowSuccess(txNum);
      setTimeout(() => setShowSuccess(null), 3000);
      setFormData({ customerName: '', withdrawalAmount: 0, serviceCharge: 0, paymentMethod: 'card' });
    } catch (err: any) {
      triggerAlert("Transaction Failed", err.message || JSON.stringify(err));
    }
  };

  const handleAddOrUpdateTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (tierFormData.maxAmount <= tierFormData.minAmount) {
      return triggerAlert("Configuration Error", "Max amount must be greater than Min amount");
    }
    if (tierFormData.id) {
      updatePOSChargeTier(tierFormData.id, tierFormData);
    } else {
      addPOSChargeTier(tierFormData);
    }
    setShowAddTierModal(false);
    setTierFormData({ id: '', minAmount: 0, maxAmount: 0, chargeAmount: 0 });
  };

  const todayTxs = useMemo(() => {
    if (!activeFloat) return [];
    return posTransactions.filter(t => t.floatId === activeFloat.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [posTransactions, activeFloat]);

  const floatBalanceHealth = useMemo(() => {
    if (!activeFloat) return 'none';
    if (activeFloat.currentBalance <= 0) return 'depleted';
    if (activeFloat.currentBalance < 10000) return 'low';
    return 'healthy';
  }, [activeFloat]);

  const confirmDeleteTransaction = () => {
    if (pendingDeleteId) {
      deletePOSTransaction(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3"><Banknote className="w-8 h-8 text-indigo-600" /> POS Cash Withdrawal</h1>
          <p className="text-slate-500 font-medium">Daily float management and customer transactions.</p>
        </div>
        <div className="flex gap-2 no-print">
          {isAdmin && (
            <button onClick={() => setShowTiersModal(true)} className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm" title="Fee Tiers"><Settings className="w-5 h-5" /></button>
          )}
          {isAdmin && !activeFloat && (
            <button onClick={() => setShowStartModal(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2"><Plus className="w-4 h-4" /> Start Daily Float</button>
          )}
        </div>
      </div>

      {activeFloat && activeFloat.currentBalance < 10000 && (
        <div className={`border-l-4 p-6 rounded-[2rem] flex items-center justify-between animate-pulse ${activeFloat.currentBalance <= 0 ? 'bg-rose-50 border-rose-600' : 'bg-amber-50 border-amber-500'}`}>
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 text-white rounded-2xl flex items-center justify-center ${activeFloat.currentBalance <= 0 ? 'bg-rose-600' : 'bg-amber-500'}`}><AlertTriangle className="w-7 h-7" /></div>
              <div>
                 <p className={`font-black uppercase text-xs tracking-widest ${activeFloat.currentBalance <= 0 ? 'text-rose-900' : 'text-amber-900'}`}>{activeFloat.currentBalance <= 0 ? 'POS Float Depleted' : 'Low Float Warning'}</p>
                 <p className={`text-sm font-bold ${activeFloat.currentBalance <= 0 ? 'text-rose-700' : 'text-amber-700'}`}>Physical cash balance is {formatCurrency(activeFloat.currentBalance)}. Top up immediately.</p>
              </div>
           </div>
           {isAdmin && <button onClick={() => { setTransferSource('shop_cash'); setShowTransferModal(true); }} className={`px-6 py-3 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg ${activeFloat.currentBalance <= 0 ? 'bg-rose-600 shadow-rose-600/20' : 'bg-amber-600 shadow-amber-600/20'}`}>Add Cash</button>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {!activeFloat ? (
            <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-slate-200 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-[2rem] flex items-center justify-center mx-auto"><Wallet className="w-10 h-10" /></div>
              <h3 className="text-xl font-black text-slate-900">Float Not Active</h3>
              <p className="text-slate-500 max-w-xs mx-auto">Please set today's opening cash balance before processing withdrawals.</p>
              {isAdmin && <button onClick={() => setShowStartModal(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-600/20">Set Opening Float</button>}
            </div>
          ) : (
            <div className={`p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden transition-all duration-500 ${floatBalanceHealth === 'depleted' ? 'bg-rose-600' : floatBalanceHealth === 'low' ? 'bg-amber-500' : 'bg-slate-900'}`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
              <div className="relative flex flex-col md:flex-row justify-between gap-10">
                <div className="space-y-6">
                  <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Cash-Out Liquidity</span>
                  <div>
                    <p className="text-white/60 font-bold text-xs uppercase tracking-widest mb-1">Available Physical Cash</p>
                    <div className="flex items-baseline gap-2">
                       <h2 className="text-6xl font-black tracking-tighter">{formatCurrency(activeFloat.currentBalance)}</h2>
                       <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${floatBalanceHealth === 'healthy' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/20'}`}>{floatBalanceHealth}</span>
                    </div>
                  </div>
                  <div className="flex gap-8">
                    <div><p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Opening</p><p className="font-bold text-sm">{formatCurrency(activeFloat.openingBalance)}</p></div>
                    <div className="w-px h-8 bg-white/10"></div>
                    <div><p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Withdrawals</p><p className="font-bold text-sm">{todayTxs.length}</p></div>
                  </div>
                </div>
                <div className="flex flex-col justify-between items-end gap-6">
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 w-full md:w-56 text-right">
                    <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-1">Total Charges Earned</p>
                    <p className="text-3xl font-black text-emerald-400">{formatCurrency(activeFloat.totalChargesEarned)}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2 w-full">
                      <button onClick={() => { setTransferSource('shop_cash'); setShowTransferModal(true); }} className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">Add Cash</button>
                      <button onClick={() => setShowCloseModal(true)} className="flex-1 px-4 py-3 bg-rose-500 hover:bg-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg">Close Day</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={`bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8 ${!activeFloat ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
            <div className="flex items-center gap-3"><div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Zap className="w-6 h-6" /></div><h3 className="text-xl font-black text-slate-900 tracking-tight">Record Withdrawal</h3></div>
            <form onSubmit={handleProcess} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Name</label>
                  <input type="text" className="w-full px-8 py-5 bg-slate-50 border-transparent rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold" placeholder="Walk-in Customer" value={formData.customerName} onFocus={e => e.target.select()} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Receipt Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setFormData({...formData, paymentMethod: 'card'})} className={`py-5 rounded-2xl border-2 font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${formData.paymentMethod === 'card' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'}`}><CreditCard className="w-4 h-4" /> Card</button>
                    <button type="button" onClick={() => setFormData({...formData, paymentMethod: 'bank_transfer'})} className={`py-5 rounded-2xl border-2 font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${formData.paymentMethod === 'bank_transfer' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'}`}><ArrowLeftRight className="w-4 h-4" /> Transfer</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount Given (Physical Cash)</label>
                  <div className="relative group">
                    <input type="number" step="100" min="100" required className="w-full px-8 py-8 bg-slate-900 text-white rounded-[2rem] text-5xl font-black outline-none focus:ring-8 focus:ring-indigo-500/10 transition-all text-center" value={formData.withdrawalAmount || ''} placeholder="0" onFocus={e => e.target.select()} onChange={e => setFormData({...formData, withdrawalAmount: Number(e.target.value)})} />
                    <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none text-white/20 font-black text-3xl">₦</div>
                  </div>
                </div>
                <div className="space-y-8 flex flex-col justify-end">
                  <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2.5rem] flex items-center justify-between">
                    <div><p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Fee</p><div className="flex items-baseline gap-2"><span className="text-xl font-black text-indigo-700">₦</span><input type="number" step="10" required className="bg-transparent text-3xl font-black text-indigo-900 outline-none w-28" value={formData.serviceCharge || ''} placeholder="0" onFocus={e => e.target.select()} onChange={e => setFormData({...formData, serviceCharge: Number(e.target.value)})} /></div></div>
                    <div className="text-right"><p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Digital Credit</p><p className="text-3xl font-black text-indigo-900">{formatCurrency(formData.withdrawalAmount + formData.serviceCharge)}</p></div>
                  </div>
                  <button type="submit" disabled={formData.withdrawalAmount <= 0} className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:bg-slate-300">Authorize Cash-Out</button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-4"><div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col min-h-[600px]"><div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center"><h4 className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Transaction Ledger</h4><span className="text-[10px] bg-indigo-600 text-white px-3 py-1 rounded-full font-black">{todayTxs.length} Today</span></div><div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">{todayTxs.map(tx => (<div key={tx.id} className="p-6 rounded-[2rem] border border-slate-50 hover:bg-slate-50/50 transition-all group relative overflow-hidden"><div className="flex justify-between items-start mb-4 relative z-10"><div><p className="font-black text-slate-900 text-sm">{tx.customerName || 'Walk-in'}</p><p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {tx.transactionNumber}</p></div><span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase ${tx.paymentMethod === 'card' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{tx.paymentMethod.replace('_', ' ')}</span></div><div className="flex justify-between items-end relative z-10"><div><p className="text-xs text-slate-500 font-medium italic">Disbursed: <span className="font-black text-slate-900 not-italic">{formatCurrency(tx.withdrawalAmount)}</span></p><p className="text-xs text-slate-500 font-medium italic">Profit: <span className="font-black text-emerald-600 not-italic">+{formatCurrency(tx.serviceCharge)}</span></p></div>{isAdmin && (<button onClick={() => setPendingDeleteId(tx.id)} className="p-2 text-rose-200 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>)}</div></div>))}{todayTxs.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40 py-20"><History className="w-12 h-12 mb-4" /><p className="font-black uppercase text-[10px] tracking-[0.2em]">No transactions logged</p></div>}</div></div></div>
      </div>

      {showStartModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowStartModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 p-12">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase">Initial Cash Float</h3>
            <p className="text-slate-500 text-sm mb-10 font-medium">Specify the total physical cash currently in the POS drawer.</p>
            <div className="space-y-8">
              <div className="relative">
                <input type="number" autoFocus className="w-full px-10 py-10 bg-slate-50 border-transparent rounded-[2.5rem] text-center text-5xl font-black text-indigo-700 outline-none focus:ring-8 focus:ring-indigo-500/10 transition-all" placeholder="0" onFocus={e => e.target.select()} id="opening-balance" />
                <span className="absolute left-10 top-1/2 -translate-y-1/2 text-indigo-200 font-black text-3xl">₦</span>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowStartModal(false)} className="flex-1 py-6 font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Abort</button>
                <button onClick={() => { const val = Number((document.getElementById('opening-balance') as HTMLInputElement).value); startPOSFloat(val); setShowStartModal(false); }} className="flex-[2] py-6 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">Commit Float</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowTransferModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 p-12">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase">Replenish Cash</h3>
            <p className="text-slate-500 text-sm mb-10 font-medium">Add more physical currency to the POS drawer from shop sales or external funds.</p>
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setTransferSource('shop_cash')} className={`py-4 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${transferSource === 'shop_cash' ? 'bg-indigo-50 text-indigo-600 border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'}`}>Shop Sales</button>
                <button type="button" onClick={() => setTransferSource('external')} className={`py-4 rounded-2xl font-black text-[10px] uppercase border-2 transition-all ${transferSource === 'external' ? 'bg-indigo-50 text-indigo-600 border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'}`}>External Capital</button>
              </div>
              <div className="relative">
                <input type="number" autoFocus className="w-full px-10 py-8 bg-slate-50 border-transparent rounded-[2rem] text-center text-4xl font-black text-indigo-700 outline-none focus:ring-8 focus:ring-indigo-500/10 transition-all" placeholder="0" onFocus={e => e.target.select()} id="transfer-amount" />
                <span className="absolute left-10 top-1/2 -translate-y-1/2 text-indigo-200 font-black text-2xl">₦</span>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowTransferModal(false)} className="flex-1 py-6 font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600">Cancel</button>
                <button onClick={() => { const val = Number((document.getElementById('transfer-amount') as HTMLInputElement).value); addPOSTransfer(val, transferSource); setShowTransferModal(false); }} className="flex-[2] py-6 bg-emerald-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">Confirm Load</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={!!pendingDeleteId} 
        onClose={() => setPendingDeleteId(null)} 
        onConfirm={confirmDeleteTransaction}
        title="Delete Transaction?"
        message="Are you sure you want to remove this record? Physical cash balances will be adjusted."
        confirmLabel="Confirm Delete"
        variant="danger"
      />
    </div>
  );
};

export default POSWithdrawals;