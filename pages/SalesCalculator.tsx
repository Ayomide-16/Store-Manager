import React, { useState, useMemo } from 'react';
import { useShop } from '../store';
import { PaymentMethod, Item } from '../types';
import { formatCurrency } from '../utils';
import { Search, ShoppingCart, Trash2, Plus, Minus, CheckCircle, Wallet, CreditCard, Scissors } from 'lucide-react';

const SalesCalculator: React.FC = () => {
  const { items, addSale } = useShop();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<{ id: string; quantity: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return [];
    return items.filter(i => 
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);
  }, [items, searchTerm]);

  const cartDetails = useMemo(() => {
    return cart.map(cartItem => {
      const item = items.find(i => i.id === cartItem.id)!;
      return { ...item, cartQuantity: cartItem.quantity };
    });
  }, [cart, items]);

  const subtotal = cartDetails.reduce((acc, curr) => acc + (curr.sellingPrice * curr.cartQuantity), 0);
  const total = subtotal + additionalCharges;

  const addToCart = (item: Item) => {
    if (item.quantityInStock <= 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        if (existing.quantity >= item.quantityInStock) return prev;
        return prev.map(i => i.id === item.id ? { ...i, quantity: Number((i.quantity + 1).toFixed(4)) } : i);
      }
      return [...prev, { id: item.id, quantity: 1 }];
    });
    setSearchTerm('');
  };

  const updateQuantity = (id: string, delta: number) => {
    const item = items.find(i => i.id === id)!;
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const step = item.allowFractional ? 0.25 : 1;
        const newQty = Math.max(step, Math.min(item.quantityInStock, i.quantity + (delta * step)));
        return { ...i, quantity: Number(newQty.toFixed(4)) };
      }
      return i;
    }));
  };

  const setFixedQuantity = (id: string, qty: number) => {
    const item = items.find(i => i.id === id)!;
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const finalQty = Math.max(0, Math.min(item.quantityInStock, qty));
        return { ...i, quantity: Number(finalQty.toFixed(4)) };
      }
      return i;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0 || !paymentMethod) return;
    try {
      await addSale({ items: cart, paymentMethod, additionalCharges });
      setCart([]);
      setPaymentMethod(null);
      setAdditionalCharges(0);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      alert("Checkout failed: " + (err.message || "Unknown error"));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {searchTerm && (
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  disabled={item.quantityInStock <= 0}
                  className="w-full text-left p-3 rounded-xl border border-slate-100 hover:bg-slate-50 flex items-center justify-between group transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-bold text-slate-900 leading-none">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{item.sku} • Stock: {item.quantityInStock}</p>
                    </div>
                    {item.allowFractional && <Scissors className="w-3.5 h-3.5 text-indigo-400" />}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600">{formatCurrency(item.sellingPrice)}</p>
                    <Plus className="w-4 h-4 ml-auto mt-1 text-indigo-400 group-hover:text-indigo-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 uppercase text-xs tracking-widest">
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
              Cart ({cart.length} items)
            </h3>
            <button onClick={() => setCart([])} className="text-xs font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 px-3 py-1 rounded-lg transition-colors">CLEAR</button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-[300px] custom-scrollbar">
            {cartDetails.map(item => (
              <div key={item.id} className="p-4 border-b border-slate-100 flex flex-col gap-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 leading-tight">{item.name}</p>
                      {item.allowFractional && <Scissors className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{formatCurrency(item.sellingPrice)} / {item.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"><Minus className="w-4 h-4" /></button>
                    <input 
                      type="number" 
                      step={item.allowFractional ? "0.25" : "1"}
                      className="w-20 text-center font-black text-slate-900 bg-white border border-slate-200 rounded-lg py-1 outline-none focus:ring-2 focus:ring-indigo-500"
                      value={item.cartQuantity || ''}
                      onFocus={e => e.target.select()}
                      onChange={(e) => setFixedQuantity(item.id, Number(e.target.value))}
                    />
                    <button onClick={() => updateQuantity(item.id, 1)} disabled={item.cartQuantity >= item.quantityInStock} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30"><Plus className="w-4 h-4" /></button>
                  </div>
                  <div className="w-24 text-right font-black text-slate-900">{formatCurrency(item.sellingPrice * item.cartQuantity)}</div>
                  <button onClick={() => removeFromCart(item.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                </div>
                {item.allowFractional && (
                  <div className="flex gap-2 pl-2">
                    {[{ label: '1/4', val: 0.25 }, { label: '1/2', val: 0.5 }, { label: '3/4', val: 0.75 }, { label: 'Full', val: 1.0 }].map(fraction => (
                      <button key={fraction.label} onClick={() => setFixedQuantity(item.id, fraction.val)} className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${item.cartQuantity === fraction.val ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>{fraction.label}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {cart.length === 0 && <div className="h-full flex flex-col items-center justify-center p-12 text-slate-400 opacity-40"><ShoppingCart className="w-16 h-16 mb-4" /><p className="font-bold uppercase text-xs tracking-widest">Cart is empty</p></div>}
          </div>
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Cart Subtotal</span>
            <span className="text-xl font-black text-slate-900">{formatCurrency(subtotal)}</span>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 sticky top-24">
          <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight flex items-center gap-3"><Wallet className="w-6 h-6 text-indigo-600" /> Checkout</h3>
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Type</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(PaymentMethod).map(method => (
                  <button key={method} onClick={() => setPaymentMethod(method)} className={`px-3 py-4 rounded-2xl border-2 text-[10px] font-black uppercase transition-all flex flex-col items-center gap-2 ${paymentMethod === method ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}`}>
                    {method === PaymentMethod.CASH && <Wallet className="w-5 h-5" />}
                    {method === PaymentMethod.BANK_TRANSFER && <CheckCircle className="w-5 h-5" />}
                    {method === PaymentMethod.CARD && <CreditCard className="w-5 h-5" />}
                    {method.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Extra Fee (POS charge, etc.)</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setAdditionalCharges(prev => Math.max(0, prev - 50))} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><Minus className="w-5 h-5" /></button>
                <input 
                  type="number"
                  className="flex-1 px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-center font-black text-xl text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={additionalCharges || ''}
                  placeholder="0"
                  onFocus={e => e.target.select()}
                  onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                />
                <button onClick={() => setAdditionalCharges(prev => prev + 50)} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"><Plus className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full translate-x-12 -translate-y-12"></div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Total to Pay</p>
            <h4 className="text-5xl font-black tracking-tighter">{formatCurrency(total)}</h4>
          </div>
          <button onClick={handleCompleteSale} disabled={cart.length === 0 || !paymentMethod} className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:bg-slate-300">Complete Order</button>
        </div>
        {showSuccess && <div className="fixed bottom-8 right-8 bg-emerald-600 text-white p-6 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-right-4 flex items-center gap-4 z-50"><CheckCircle className="w-8 h-8" /><div><p className="font-black text-sm uppercase tracking-widest leading-none">Order Logged</p><p className="text-xs text-white/80 font-medium mt-1">Stock levels updated in real-time.</p></div></div>}
      </div>
    </div>
  );
};

export default SalesCalculator;