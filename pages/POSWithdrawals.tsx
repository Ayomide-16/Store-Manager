import React, { useState, useMemo, useEffect } from 'react';
import { useShop } from '../store';
import { UserRole, PaymentMethod, POSChargeTier } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../utils';
import { 
  Banknote, Plus, Wallet, AlertTriangle, ArrowUpRight, 
  History, User, CheckCircle, CreditCard, ChevronRight, 
  X, Settings, RefreshCw, Zap, Minus, ArrowLeftRight, Trash2, ShieldCheck, PlusCircle, Edit2, Eraser
} from 'lucide-react';

const POSWithdrawals: React.FC = () => {
  const { 
    currentUser, posFloats, posTransactions, posTransfers, posChargeTiers,
    startPOSFloat, addPOSTransaction, addPOSTransfer, closePOSFloat, deletePOSTransaction, 
    addPOSChargeTier, updatePOSChargeTier, deletePOSChargeTier, resetPOSTiersToDefault, clearPOSTiers
  } = useShop();

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const today = new Date().toISOString().split('T')[0];
  const activeFloat = posFloats.find(f => f.status === 'active' && f.date === today);
  
  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    withdrawalAmount: 0,
    serviceCharge: 0,
    paymentMethod: 'card' as 'card' | 'bank_transfer'
  });

  // Tier form state
  const [tierFormData, setTierFormData] = useState({
    id: '',
    minAmount: 0,
    maxAmount: 0,
    chargeAmount: 0
  });

  // Modal states
  const [showStartModal, setShowStartModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSource, setTransferSource] = useState<'shop_cash' | 'external'>('shop_cash');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showTiersModal, setShowTiersModal] = useState(false);
  const [showAddTierModal, setShowAddTierModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  // Auto-calculate charge
  useEffect(() => {
    const amount = formData.withdrawalAmount;
    const tier = posChargeTiers.find(t => t.isActive && amount >= t.minAmount && amount <= t.maxAmount);
    if (tier) {
      setFormData(prev => ({ ...prev, serviceCharge: tier.chargeAmount }));
    }
  }, [formData.withdrawalAmount, posChargeTiers]);

  const handleProcess = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const txNum = addPOSTransaction(formData);
      setShowSuccess(txNum);
      setTimeout(() => setShowSuccess(null), 3000);
      setFormData({ customerName: '', withdrawalAmount: 0, serviceCharge: 0, paymentMethod: 'card' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddOrUpdateTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (tierFormData.maxAmount <= tierFormData.minAmount) {
      return alert("Max amount must be greater than Min amount");
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Banknote className="w-8 h-8 text-indigo-600" />
            POS Cash Withdrawal
          </h1>
          <p className="text-slate-500 font-medium">Daily float management and customer transactions.</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button 
              onClick={() => setShowTiersModal(true)}
              className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"
              title="Manage Fee Tiers"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
          {isAdmin && !activeFloat && (
            <button 
              onClick={() => setShowStartModal(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Start Daily Float
            </button>
          )}
        </div>
      </div>

      {activeFloat && activeFloat.currentBalance < 10000 && (
        <div className={`border-l-4 p-6 rounded-[2rem] flex items-center justify-between animate-pulse ${activeFloat.currentBalance <= 0 ? 'bg-rose-50 border-rose-600' : 'bg-amber-50 border-amber-500'}`}>
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 text-white rounded-2xl flex items-center justify-center ${activeFloat.currentBalance <= 0 ? 'bg-rose-600' : 'bg-amber-500'}`}>
                 <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                 <p className={`font-black uppercase text-xs tracking-widest ${activeFloat.currentBalance <= 0 ? 'text-rose-900' : 'text-amber-900'}`}>
                    {activeFloat.currentBalance <= 0 ? 'POS Float Depleted' : 'Low Float Warning'}
                 </p>
                 <p className={`text-sm font-bold ${activeFloat.currentBalance <= 0 ? 'text-rose-700' : 'text-amber-700'}`}>
                    Physical cash balance is {formatCurrency(activeFloat.currentBalance)}. Top up immediately.
                 </p>
              </div>
           </div>
           {isAdmin && (
             <button onClick={() => { setTransferSource('shop_cash'); setShowTransferModal(true); }} className={`px-6 py-3 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg ${activeFloat.currentBalance <= 0 ? 'bg-rose-600 shadow-rose-600/20' : 'bg-amber-600 shadow-amber-600/20'}`}>Add Cash</button>
           )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {!activeFloat ? (
            <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-slate-200 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-[2rem] flex items-center justify-center mx-auto">
                <Wallet className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">No Active POS Float Today</h3>
              <p className="text-slate-500 max-w-xs mx-auto">Physical cash must be set aside before processing withdrawals.</p>
              {isAdmin && (
                <button 
                  onClick={() => setShowStartModal(true)}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all"
                >
                  Start Float Now
                </button>
              )}
            </div>
          ) : (
            <div className={`p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden transition-all duration-500 ${
              floatBalanceHealth === 'depleted' ? 'bg-rose-600' : 
              floatBalanceHealth === 'low' ? 'bg-amber-500' : 'bg-slate-900'
            }`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
              <div className="relative flex flex-col md:flex-row justify-between gap-10">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">Today's Float</span>
                    <span className="text-white/50 text-[10px] font-black uppercase tracking-widest">{formatDate(activeFloat.date)}</span>
                  </div>
                  <div>
                    <p className="text-white/60 font-bold text-xs uppercase tracking-widest mb-1">Physical Cash Available</p>
                    <div className="flex items-baseline gap-2">
                       <h2 className="text-6xl font-black tracking-tighter">{formatCurrency(activeFloat.currentBalance)}</h2>
                       <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${floatBalanceHealth === 'healthy' ? 'bg-emerald-500/20 text-emerald-300' : floatBalanceHealth === 'low' ? 'bg-white/20 text-white' : 'bg-white/30 text-white'}`}>
                          {floatBalanceHealth}
                       </span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Opening</p>
                      <p className="font-bold">{formatCurrency(activeFloat.openingBalance)}</p>
                    </div>
                    <div className="w-px h-8 bg-white/10 self-center"></div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Transactions</p>
                      <p className="font-bold">{todayTxs.length} Cash-outs</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col justify-between items-end gap-6">
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 w-full md:w-56">
                    <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-1">Service Profit</p>
                    <p className="text-3xl font-black text-emerald-400">{formatCurrency(activeFloat.totalChargesEarned)}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2 w-full">
                      <button onClick={() => { setTransferSource('shop_cash'); setShowTransferModal(true); }} className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Add Cash</button>
                      <button onClick={() => setShowCloseModal(true)} className="flex-1 px-4 py-3 bg-rose-50 hover:bg-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg">Close Day</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={`bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 ${!activeFloat ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">New Transaction</h3>
            </div>

            <form onSubmit={handleProcess} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Name (Optional)</label>
                  <input 
                    type="text"
                    className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                    placeholder="Enter name"
                    onFocus={e => e.target.select()}
                    value={formData.customerName}
                    onChange={e => setFormData({...formData, customerName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, paymentMethod: 'card'})}
                      className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${formData.paymentMethod === 'card' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                    >
                      <CreditCard className="w-4 h-4" /> Card
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, paymentMethod: 'bank_transfer'})}
                      className={`py-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${formData.paymentMethod === 'bank_transfer' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                    >
                      <ArrowLeftRight className="w-4 h-4" /> Transfer
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cash to Give (Withdrawal Amount)</label>
                  <div className="relative group">
                    <input 
                      type="number" step="100" min="100" required
                      className="w-full px-8 py-6 bg-slate-900 text-white rounded-[2rem] text-4xl font-black outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all text-center"
                      value={formData.withdrawalAmount || ''}
                      onFocus={e => e.target.select()}
                      onChange={e => setFormData({...formData, withdrawalAmount: Number(e.target.value)})}
                      placeholder="0"
                    />
                    <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-white/20 font-black text-2xl">₦</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem]">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Service Charge</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-indigo-700">₦</span>
                      <input 
                        type="number" step="10" required
                        className="flex-1 bg-transparent text-3xl font-black text-indigo-900 outline-none"
                        value={formData.serviceCharge || ''}
                        onFocus={e => e.target.select()}
                        onChange={e => setFormData({...formData, serviceCharge: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-emerald-600 p-6 rounded-[2rem] text-white flex justify-between items-center shadow-xl shadow-emerald-600/20">
                    <div>
                      <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Customer Pays</p>
                      <p className="text-4xl font-black tracking-tighter">{formatCurrency(formData.withdrawalAmount + formData.serviceCharge)}</p>
                    </div>
                    <button 
                      type="submit"
                      disabled={formData.withdrawalAmount <= 0}
                      className="px-8 py-5 bg-white text-emerald-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      Process
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col min-h-[600px]">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Today's Ledger</h4>
              <span className="text-[10px] bg-indigo-600 text-white px-2.5 py-1 rounded-full font-black">{todayTxs.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {todayTxs.map(tx => (
                <div key={tx.id} className="p-5 rounded-3xl border border-slate-50 hover:bg-slate-50 transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-black text-slate-900 text-sm leading-none">{tx.customerName || 'Walk-in Customer'}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {tx.transactionNumber}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${tx.paymentMethod === 'card' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{tx.paymentMethod.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-500 font-medium">Cash Out: <span className="font-black text-slate-900">{formatCurrency(tx.withdrawalAmount)}</span></p>
                      <p className="text-xs text-slate-500 font-medium">Profit: <span className="font-black text-emerald-600">+{formatCurrency(tx.serviceCharge)}</span></p>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={() => window.confirm('Delete this record?') && deletePOSTransaction(tx.id)} 
                        className="text-rose-300 hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showStartModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowStartModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 p-10">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Set Daily POS Float</h3>
            <p className="text-slate-500 text-sm mb-8">Count physical cash reserved for customer withdrawals today.</p>
            <div className="space-y-6">
              <div className="relative">
                <input 
                  type="number" autoFocus
                  className="w-full px-10 py-8 bg-slate-50 border-transparent rounded-[2rem] text-center text-4xl font-black text-indigo-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  placeholder="0"
                  onFocus={e => e.target.select()}
                  id="opening-balance"
                />
                <span className="absolute left-8 top-1/2 -translate-y-1/2 text-indigo-200 font-black text-2xl">₦</span>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowStartModal(false)} className="flex-1 py-5 font-black text-xs uppercase tracking-widest text-slate-400">Cancel</button>
                <button 
                  onClick={() => { 
                    const val = Number((document.getElementById('opening-balance') as HTMLInputElement).value);
                    startPOSFloat(val); 
                    setShowStartModal(false); 
                  }}
                  className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl"
                >
                  Confirm Float
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowTransferModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 p-10">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Replenish POS Cash</h3>
            <p className="text-slate-500 text-sm mb-8">Move physical cash into the Withdrawal Float.</p>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Source</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => setTransferSource('shop_cash')}
                    className={`py-3 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${transferSource === 'shop_cash' ? 'bg-indigo-50 text-indigo-600 border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'}`}
                  >
                    Shop Cash
                  </button>
                  <button 
                    type="button"
                    onClick={() => setTransferSource('external')}
                    className={`py-3 rounded-xl font-black text-[10px] uppercase border-2 transition-all ${transferSource === 'external' ? 'bg-indigo-50 text-indigo-600 border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'}`}
                  >
                    External
                  </button>
                </div>
              </div>
              <div className="relative">
                <input 
                  type="number" autoFocus
                  className="w-full px-10 py-6 bg-slate-50 border-transparent rounded-[1.5rem] text-center text-3xl font-black text-indigo-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  placeholder="0"
                  onFocus={e => e.target.select()}
                  id="transfer-amount"
                />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowTransferModal(false)} className="flex-1 py-5 font-black text-xs uppercase tracking-widest text-slate-400">Cancel</button>
                <button 
                  onClick={() => { 
                    const val = Number((document.getElementById('transfer-amount') as HTMLInputElement).value);
                    addPOSTransfer(val, transferSource); 
                    setShowTransferModal(false); 
                  }}
                  className="flex-[2] py-5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 shadow-xl"
                >
                  Confirm Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddTierModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowAddTierModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 p-8">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  {tierFormData.id ? <Edit2 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
               </div>
               <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{tierFormData.id ? 'Update Tier' : 'Create New Tier'}</h3>
            </div>
            <form onSubmit={handleAddOrUpdateTier} className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min (₦)</label>
                     <input type="number" required className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl text-lg font-black outline-none focus:ring-2 focus:ring-indigo-500" value={tierFormData.minAmount || ''} onFocus={e => e.target.select()} onChange={e => setTierFormData({...tierFormData, minAmount: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Max (₦)</label>
                     <input type="number" required className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl text-lg font-black outline-none focus:ring-2 focus:ring-indigo-500" value={tierFormData.maxAmount || ''} onFocus={e => e.target.select()} onChange={e => setTierFormData({...tierFormData, maxAmount: Number(e.target.value)})} />
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Charge Fee (₦)</label>
                  <input type="number" required className="w-full px-6 py-5 bg-indigo-50 text-indigo-700 border-transparent rounded-2xl text-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500" value={tierFormData.chargeAmount || ''} onFocus={e => e.target.select()} onChange={e => setTierFormData({...tierFormData, chargeAmount: Number(e.target.value)})} />
               </div>
               <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddTierModal(false)} className="flex-1 py-4 font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600">Cancel</button>
                  <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-600/20 transform active:scale-95 transition-all">
                    {tierFormData.id ? 'Apply Changes' : 'Create Tier'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSWithdrawals;