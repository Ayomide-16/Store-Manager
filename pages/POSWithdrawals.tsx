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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight font-medium text-slate-900 tracking-tight flex items-center gap-4 "><Banknote className="w-8 h-8 text-blue-500" /> POS Cash Withdrawal</h1>
          <p className="text-slate-500 font-medium text-sm  tracking-normal mt-2">Daily float management and customer transactions.</p>
        </div>
        <div className="flex gap-4 no-print">
          {isAdmin && (
            <button onClick={() => setShowTiersModal(true)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-900 hover:bg-slate-50 transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)]" title="Fee Tiers"><Settings className="w-6 h-6" /></button>
          )}
          {isAdmin && !activeFloat && (
            <button onClick={() => setShowStartModal(true)} className="px-6 py-3 bg-blue-600 border border-slate-200 rounded-2xl text-white font-medium font-bold text-xs  tracking-normal hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all flex items-center gap-3"><Plus className="w-5 h-5" /> Start Daily Float</button>
          )}
        </div>
      </div>

      {activeFloat && activeFloat.currentBalance < 10000 && (
        <div className={`border-4 p-8 flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-pulse ${activeFloat.currentBalance <= 0 ? 'bg-red-50 border-red-600' : 'bg-yellow-100 border-slate-200'}`}>
           <div className="flex items-center gap-6">
              <div className={`w-16 h-16 border border-slate-200 rounded-2xl text-white flex items-center justify-center shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${activeFloat.currentBalance <= 0 ? 'bg-red-600' : 'bg-yellow-400'}`}><AlertTriangle className="w-8 h-8" /></div>
              <div>
                 <p className={`font-medium font-bold  text-xs tracking-normal ${activeFloat.currentBalance <= 0 ? 'text-red-900' : 'text-slate-900'}`}>{activeFloat.currentBalance <= 0 ? 'POS Float Depleted' : 'Low Float Warning'}</p>
                 <p className={`text-base font-semibold tracking-tight font-medium mt-1 ${activeFloat.currentBalance <= 0 ? 'text-red-700' : 'text-slate-900'}`}>Physical cash balance is {formatCurrency(activeFloat.currentBalance)}. Top up immediately.</p>
              </div>
           </div>
           {isAdmin && <button onClick={() => { setTransferSource('shop_cash'); setShowTransferModal(true); }} className={`px-6 py-4 border border-slate-200 rounded-2xl text-slate-900 font-medium font-bold  text-[10px] tracking-normal shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${activeFloat.currentBalance <= 0 ? 'bg-red-500 text-white' : 'bg-yellow-400'}`}>Add Cash</button>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          {!activeFloat ? (
            <div className="bg-white/60 backdrop-blur-3xl p-16 border-4 border-dashed border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center space-y-6">
              <div className="w-24 h-24 bg-white border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 text-slate-300 flex items-center justify-center mx-auto shadow-[0_2px_10px_rgb(0,0,0,0.02)]"><Wallet className="w-12 h-12 text-slate-900" /></div>
              <h3 className="text-3xl font-semibold tracking-tight font-medium text-slate-900 ">Float Not Active</h3>
              <p className="text-slate-500 max-w-sm mx-auto font-medium text-sm  tracking-normal">Please set today's opening cash balance before processing withdrawals.</p>
              {isAdmin && <button onClick={() => setShowStartModal(true)} className="px-10 py-5 bg-blue-600 border border-slate-200 rounded-2xl text-white font-medium font-bold text-xs  tracking-normal hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)]">Set Opening Float</button>}
            </div>
          ) : (
            <div className={`p-12 border-4 text-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden transition-all duration-500 ${floatBalanceHealth === 'depleted' ? 'bg-red-600 border-slate-200' : floatBalanceHealth === 'low' ? 'bg-yellow-400 border-slate-200 text-slate-900' : 'bg-slate-900 border-black text-white'}`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
              <div className="relative flex flex-col md:flex-row justify-between gap-10">
                <div className="space-y-8">
                  <span className={`px-4 py-2 border-2 font-medium font-bold text-[10px]  tracking-normal shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${floatBalanceHealth === 'low' ? 'bg-white border-slate-200 text-slate-900' : 'bg-black/20 border-black text-white'}`}>Cash-Out Liquidity</span>
                  <div>
                    <p className={`font-medium font-bold text-[10px]  tracking-normal mb-2 ${floatBalanceHealth === 'low' ? 'text-slate-900/60' : 'text-white/60'}`}>Available Physical Cash</p>
                    <div className="flex items-baseline gap-4">
                       <h2 className={`text-7xl font-semibold tracking-tight font-medium tracking-tighter ${floatBalanceHealth === 'healthy' ? 'text-blue-500Light' : ''}`}>{formatCurrency(activeFloat.currentBalance)}</h2>
                       <span className={`text-[10px] font-medium font-bold  tracking-normal px-3 py-1 border-2 shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${floatBalanceHealth === 'healthy' ? 'bg-[#10b981] border-slate-200 text-slate-900' : floatBalanceHealth === 'low' ? 'bg-white border-slate-200 text-slate-900' : 'bg-black border-red-900 text-red-500'}`}>{floatBalanceHealth}</span>
                    </div>
                  </div>
                  <div className="flex gap-10">
                    <div><p className={`font-medium font-bold text-[10px]  tracking-normal ${floatBalanceHealth === 'low' ? 'text-slate-900/60' : 'text-white/40'}`}>Opening</p><p className="font-semibold tracking-tight font-medium text-xl">{formatCurrency(activeFloat.openingBalance)}</p></div>
                    <div className={`w-1 h-12 ${floatBalanceHealth === 'low' ? 'bg-slate-900/20' : 'bg-white/20'}`}></div>
                    <div><p className={`font-medium font-bold text-[10px]  tracking-normal ${floatBalanceHealth === 'low' ? 'text-slate-900/60' : 'text-white/40'}`}>Withdrawals</p><p className="font-semibold tracking-tight font-medium text-xl">{todayTxs.length}</p></div>
                  </div>
                </div>
                <div className="flex flex-col justify-between items-end gap-8">
                  <div className={`p-8 border-4 text-right shadow-[0_2px_10px_rgb(0,0,0,0.02)] w-full md:w-64 ${floatBalanceHealth === 'low' ? 'bg-white border-slate-200' : 'bg-black/20 border-black backdrop-blur-md'}`}>
                    <p className={`font-medium font-bold  text-[10px] tracking-normal mb-2 ${floatBalanceHealth === 'low' ? 'text-slate-900/50' : 'text-white/50'}`}>Total Charges Earned</p>
                    <p className={`text-4xl font-semibold tracking-tight font-medium ${floatBalanceHealth === 'low' ? 'text-slate-900' : 'text-[#10b981]'}`}>{formatCurrency(activeFloat.totalChargesEarned)}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-4 w-full">
                      <button onClick={() => { setTransferSource('shop_cash'); setShowTransferModal(true); }} className={`flex-1 px-5 py-4 border-2 font-medium font-bold text-[10px]  tracking-normal shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-sm transition-all ${floatBalanceHealth === 'low' ? 'bg-white border-slate-200 text-slate-900' : 'bg-black border-slate-200 text-white hover:bg-slate-900'}`}>Add Cash</button>
                      <button onClick={() => setShowCloseModal(true)} className={`flex-1 px-5 py-4 border-2 font-medium font-bold text-[10px]  tracking-normal shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-sm transition-all ${floatBalanceHealth === 'low' ? 'bg-slate-900 border-slate-200 text-white' : 'bg-red-600 border-black text-white hover:bg-red-700'}`}>Close Day</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={`bg-white/60 backdrop-blur-3xl p-12 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-10 ${!activeFloat ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
            <div className="flex items-center gap-4"><div className="w-12 h-12 bg-blue-600 text-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-[0_2px_10px_rgb(0,0,0,0.02)]"><Zap className="w-6 h-6" /></div><h3 className="text-3xl font-semibold tracking-tight font-medium text-slate-900 tracking-tight ">Record Withdrawal</h3></div>
            <form onSubmit={handleProcess} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-medium font-bold text-slate-500  tracking-normal">Customer Name</label>
                  <input type="text" className="w-full px-6 py-5 bg-white border border-slate-200 rounded-2xl outline-none focus:bg-slate-50 font-medium font-bold text-slate-900" placeholder="Walk-in Customer" value={formData.customerName} onFocus={e => e.target.select()} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-medium font-bold text-slate-500  tracking-normal">Receipt Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setFormData({...formData, paymentMethod: 'card'})} className={`py-5 border-2 font-medium font-bold text-[10px]  transition-all flex items-center justify-center gap-3 ${formData.paymentMethod === 'card' ? 'border-slate-200 bg-blue-600 text-white shadow-[0_2px_10px_rgb(0,0,0,0.02)]' : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50 shadow-[0_2px_10px_rgb(0,0,0,0.02)]'}`}><CreditCard className="w-5 h-5" /> Card</button>
                    <button type="button" onClick={() => setFormData({...formData, paymentMethod: 'bank_transfer'})} className={`py-5 border-2 font-medium font-bold text-[10px]  transition-all flex items-center justify-center gap-3 ${formData.paymentMethod === 'bank_transfer' ? 'border-slate-200 bg-blue-600 text-white shadow-[0_2px_10px_rgb(0,0,0,0.02)]' : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50 shadow-[0_2px_10px_rgb(0,0,0,0.02)]'}`}><ArrowLeftRight className="w-5 h-5" /> Transfer</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-medium font-bold text-slate-500  tracking-normal">Amount Given (Physical Cash)</label>
                  <div className="relative group">
                    <input type="number" step="100" min="100" required className="w-full px-10 py-10 bg-slate-900 text-white border border-slate-200 rounded-[2rem] shadow-sm border-dashed text-6xl font-semibold tracking-tight font-medium outline-none transition-all text-center" value={formData.withdrawalAmount || ''} placeholder="0" onFocus={e => e.target.select()} onChange={e => setFormData({...formData, withdrawalAmount: Number(e.target.value)})} />
                    <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none text-white/30 font-semibold tracking-tight font-medium text-4xl">₦</div>
                  </div>
                </div>
                <div className="space-y-8 flex flex-col justify-end">
                  <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 p-8 flex items-center justify-between shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                    <div><p className="text-[10px] font-medium font-bold text-slate-400  tracking-normal mb-2">Fee</p><div className="flex items-baseline gap-2"><span className="text-2xl font-medium font-bold text-slate-900">₦</span><input type="number" step="10" required className="bg-transparent text-4xl font-semibold tracking-tight font-medium text-slate-900 outline-none w-32 border-b-2 border-dashed border-slate-300 focus:border-slate-200" value={formData.serviceCharge || ''} placeholder="0" onFocus={e => e.target.select()} onChange={e => setFormData({...formData, serviceCharge: Number(e.target.value)})} /></div></div>
                    <div className="text-right"><p className="text-[10px] font-medium font-bold text-slate-400  tracking-normal mb-2">Total Digital Credit</p><p className="text-4xl font-semibold tracking-tight font-medium text-blue-500">{formatCurrency(formData.withdrawalAmount + formData.serviceCharge)}</p></div>
                  </div>
                  <button type="submit" disabled={formData.withdrawalAmount <= 0} className="w-full py-6 bg-[#10b981] text-slate-900 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 font-medium font-bold text-sm  tracking-[0.2em] shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-50 disabled:bg-slate-200">Authorize Cash-Out</button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-4"><div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden h-full flex flex-col min-h-[600px]"><div className="p-8 border-b border-slate-100 bg-white/60 backdrop-blur-3xl flex justify-between items-center"><h4 className="font-semibold tracking-tight font-medium text-slate-900  text-xl tracking-tight">Ledger</h4><span className="text-[10px] bg-slate-900 text-white px-4 py-2 border border-slate-200 rounded-2xl font-medium font-bold shadow-[0_2px_10px_rgb(0,0,0,0.02)]">{todayTxs.length} Today</span></div><div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">{todayTxs.map(tx => (<div key={tx.id} className="p-6 border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] bg-white transition-all group relative overflow-hidden"><div className="flex justify-between items-start mb-4 relative z-10"><div><p className="font-medium font-bold text-slate-900 text-sm ">{tx.customerName || 'Walk-in'}</p><p className="text-[9px] font-medium font-bold text-slate-400  mt-2">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {tx.transactionNumber}</p></div><span className={`px-3 py-1 border border-slate-200 rounded-2xl text-[8px] font-medium font-bold  shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${tx.paymentMethod === 'card' ? 'bg-cyan-400 text-slate-900' : 'bg-blue-600 text-white'}`}>{tx.paymentMethod.replace('_', ' ')}</span></div><div className="flex justify-between items-end relative z-10"><div><p className="text-[10px] text-slate-500 font-medium font-bold  tracking-normal flex flex-col gap-1">Disbursed: <span className="font-semibold tracking-tight font-medium text-xl text-slate-900 leading-none">{formatCurrency(tx.withdrawalAmount)}</span></p><p className="text-[10px] text-slate-500 font-medium font-bold  tracking-normal mt-3 flex flex-col gap-1">Profit: <span className="font-semibold tracking-tight font-medium text-xl text-[#10b981] bg-slate-900 px-2 py-0.5 inline-block w-max leading-none">{formatCurrency(tx.serviceCharge)}</span></p></div>{isAdmin && (<button onClick={() => setPendingDeleteId(tx.id)} className="w-10 h-10 border-2 border-transparent hover:border-red-600 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center"><Trash2 className="w-5 h-5" /></button>)}</div></div>))}{todayTxs.length === 0 && <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 py-20 bg-slate-50"><History className="w-16 h-16 mb-6" /><p className="font-medium font-bold  text-[10px] tracking-[0.2em]">No transactions logged</p></div>}</div></div></div>
      </div>


      {showStartModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowStartModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 p-12">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 ">Initial Cash Float</h3>
            <p className="text-slate-500 text-sm mb-10 font-medium">Specify the total physical cash currently in the POS drawer.</p>
            <div className="space-y-8">
              <div className="relative">
                <input type="number" autoFocus className="w-full px-10 py-10 bg-slate-50 border-transparent rounded-[2.5rem] text-center text-5xl font-black text-indigo-700 outline-none focus:ring-8 focus:ring-indigo-500/10 transition-all" placeholder="0" onFocus={e => e.target.select()} id="opening-balance" />
                <span className="absolute left-10 top-1/2 -translate-y-1/2 text-indigo-200 font-black text-3xl">₦</span>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowStartModal(false)} className="flex-1 py-6 font-black text-xs  tracking-normal text-slate-400 hover:text-slate-600 transition-colors">Abort</button>
                <button onClick={() => { const val = Number((document.getElementById('opening-balance') as HTMLInputElement).value); startPOSFloat(val); setShowStartModal(false); }} className="flex-[2] py-6 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs  tracking-normal hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">Commit Float</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowTransferModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 p-12">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 ">Replenish Cash</h3>
            <p className="text-slate-500 text-sm mb-10 font-medium">Add more physical currency to the POS drawer from shop sales or external funds.</p>
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setTransferSource('shop_cash')} className={`py-4 rounded-2xl font-black text-[10px]  border-2 transition-all ${transferSource === 'shop_cash' ? 'bg-indigo-50 text-indigo-600 border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'}`}>Shop Sales</button>
                <button type="button" onClick={() => setTransferSource('external')} className={`py-4 rounded-2xl font-black text-[10px]  border-2 transition-all ${transferSource === 'external' ? 'bg-indigo-50 text-indigo-600 border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'}`}>External Capital</button>
              </div>
              <div className="relative">
                <input type="number" autoFocus className="w-full px-10 py-8 bg-slate-50 border-transparent rounded-[2rem] text-center text-4xl font-black text-indigo-700 outline-none focus:ring-8 focus:ring-indigo-500/10 transition-all" placeholder="0" onFocus={e => e.target.select()} id="transfer-amount" />
                <span className="absolute left-10 top-1/2 -translate-y-1/2 text-indigo-200 font-black text-2xl">₦</span>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowTransferModal(false)} className="flex-1 py-6 font-black text-xs  tracking-normal text-slate-400 hover:text-slate-600">Cancel</button>
                <button onClick={() => { const val = Number((document.getElementById('transfer-amount') as HTMLInputElement).value); addPOSTransfer(val, transferSource); setShowTransferModal(false); }} className="flex-[2] py-6 bg-emerald-600 text-white rounded-[1.5rem] font-black text-xs  tracking-normal hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">Confirm Load</button>
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