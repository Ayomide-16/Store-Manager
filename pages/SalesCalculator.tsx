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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="bg-white/60 backdrop-blur-3xl p-6 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_2px_10px_rgb(0,0,0,0.02)] space-y-4">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-900 w-6 h-6" />
            <input 
              type="text"
              placeholder="Search products..."
              className="w-full pl-14 pr-5 py-4 bg-white border border-slate-200 rounded-2xl font-medium font-bold text-slate-900 focus:ring-0 focus:bg-slate-50 outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {searchTerm && (
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  disabled={item.quantityInStock <= 0}
                  className="w-full text-left p-4 border border-slate-200 rounded-2xl bg-white flex items-center justify-between group transition-all hover:-translate-y-px hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] disabled:opacity-50 disabled:hover:shadow-none disabled:hover:translate-y-0"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium font-bold text-slate-900 text-base  leading-none">{item.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium tracking-normal mt-1.5">{item.sku} • Stock: {item.quantityInStock}</p>
                    </div>
                    {item.allowFractional && <Scissors className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="font-sans font-bold text-lg text-slate-900">{formatCurrency(item.sellingPrice)}</p>
                    <Plus className="w-5 h-5 mt-1 text-slate-900 group-hover:text-blue-500" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/60 backdrop-blur-3xl border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex-1 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-white flex items-center justify-between">
            <h3 className="font-semibold tracking-tight font-medium text-xl text-slate-900 tracking-tight flex items-center gap-3">
              <ShoppingCart className="w-6 h-6 text-blue-500" />
              Cart ({cart.length})
            </h3>
            <button onClick={() => setCart([])} className="text-xs font-medium font-bold text-white bg-red-600 border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)]  tracking-normal px-4 py-2 hover:-translate-y-0.5 hover:shadow-sm transition-all">CLEAR</button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-[300px] bg-slate-50 custom-scrollbar">
            {cartDetails.map(item => (
              <div key={item.id} className="p-6 border-b-2 border-slate-200 flex flex-col gap-4 bg-white hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium font-bold  text-slate-900">{item.name}</p>
                      {item.allowFractional && <Scissors className="w-4 h-4 text-blue-500" />}
                    </div>
                    <p className="text-xs text-slate-500 font-sans font-medium mt-1">{formatCurrency(item.sellingPrice)} / {item.unit}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-2xl bg-white hover:bg-slate-100 text-slate-900"><Minus className="w-5 h-5" /></button>
                    <input 
                      type="number" 
                      step={item.allowFractional ? "0.25" : "1"}
                      className="w-20 text-center font-medium font-bold text-slate-900 bg-white border border-slate-200 rounded-2xl py-2 focus:ring-0 outline-none"
                      value={item.cartQuantity || ''}
                      onFocus={e => e.target.select()}
                      onChange={(e) => setFixedQuantity(item.id, Number(e.target.value))}
                    />
                    <button onClick={() => updateQuantity(item.id, 1)} disabled={item.cartQuantity >= item.quantityInStock} className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 disabled:opacity-30"><Plus className="w-5 h-5" /></button>
                  </div>
                  <div className="w-28 text-right font-sans font-bold text-xl text-slate-900">{formatCurrency(item.sellingPrice * item.cartQuantity)}</div>
                  <button onClick={() => removeFromCart(item.id)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 border-2 border-transparent hover:border-red-200 transition-all"><Trash2 className="w-5 h-5" /></button>
                </div>
                {item.allowFractional && (
                  <div className="flex gap-3 pl-2 mt-2">
                    {[{ label: '1/4', val: 0.25 }, { label: '1/2', val: 0.5 }, { label: '3/4', val: 0.75 }, { label: 'Full', val: 1.0 }].map(fraction => (
                      <button key={fraction.label} onClick={() => setFixedQuantity(item.id, fraction.val)} className={`px-4 py-2 border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-sm text-[10px] font-medium font-bold  transition-all ${item.cartQuantity === fraction.val ? 'bg-blue-600 text-white' : 'bg-white text-slate-900 hover:bg-slate-50'}`}>{fraction.label}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {cart.length === 0 && <div className="h-full flex flex-col items-center justify-center p-16 text-slate-300"><ShoppingCart className="w-20 h-20 mb-6" /><p className="font-medium font-bold  tracking-normal">Cart is empty</p></div>}
          </div>
          <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center">
            <span className="text-slate-500 font-medium font-bold  text-[10px] tracking-normal">Cart Subtotal</span>
            <span className="text-3xl font-semibold tracking-tight font-medium text-slate-900">{formatCurrency(subtotal)}</span>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-white/60 backdrop-blur-3xl p-8 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-8 sticky top-28">
          <h3 className="font-semibold tracking-tight font-medium text-3xl text-slate-900 tracking-tight flex items-center gap-4"><Wallet className="w-8 h-8 text-blue-500" /> Checkout</h3>
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="block text-[10px] font-medium font-bold text-slate-500  tracking-normal">Payment Type</label>
              <div className="grid grid-cols-3 gap-3">
                {Object.values(PaymentMethod).map(method => (
                  <button key={method} onClick={() => setPaymentMethod(method)} className={`py-5 border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] text-[10px] font-medium font-bold  transition-all flex flex-col items-center gap-3 ${paymentMethod === method ? 'bg-blue-600 text-white hover:-translate-y-0.5 hover:shadow-sm' : 'bg-white text-slate-900 hover:-translate-y-0.5 hover:shadow-sm'}`}>
                    {method === PaymentMethod.CASH && <Wallet className="w-6 h-6" />}
                    {method === PaymentMethod.BANK_TRANSFER && <CheckCircle className="w-6 h-6" />}
                    {method === PaymentMethod.CARD && <CreditCard className="w-6 h-6" />}
                    {method.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-[10px] font-medium font-bold text-slate-500  tracking-normal">Extra Fee (POS charge)</label>
              <div className="flex items-center gap-3 bg-white p-2 border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                <button onClick={() => setAdditionalCharges(prev => Math.max(0, prev - 50))} className="w-12 h-12 flex items-center justify-center border border-slate-200 rounded-2xl bg-white/60 backdrop-blur-3xl hover:bg-slate-100 transition-colors"><Minus className="w-6 h-6" /></button>
                <input 
                  type="number"
                  className="flex-1 px-4 py-4 bg-transparent text-center font-semibold tracking-tight font-medium text-2xl text-slate-900 outline-none"
                  value={additionalCharges || ''}
                  placeholder="0"
                  onFocus={e => e.target.select()}
                  onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                />
                <button onClick={() => setAdditionalCharges(prev => prev + 50)} className="w-12 h-12 flex items-center justify-center border border-slate-200 rounded-2xl bg-white/60 backdrop-blur-3xl hover:bg-slate-100 transition-colors"><Plus className="w-6 h-6" /></button>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 p-10 text-white border-4 border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
            <p className="text-white/50 text-[10px] font-medium font-bold  tracking-normal mb-2">Total to Pay</p>
            <h4 className="text-5xl font-semibold tracking-tight font-medium tracking-tight text-blue-500Light">{formatCurrency(total)}</h4>
          </div>
          <button onClick={handleCompleteSale} disabled={cart.length === 0 || !paymentMethod} className="w-full py-6 bg-blue-600 border border-slate-200 rounded-2xl text-white font-medium font-bold text-xs  tracking-[0.2em] shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all disabled:opacity-50 flex items-center justify-center gap-3">
            <CheckCircle className="w-5 h-5" />
            Complete Order
          </button>
        </div>
        {showSuccess && <div className="fixed bottom-10 right-10 bg-[#10b981] text-slate-900 p-6 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in fade-in slide-in-from-bottom-4 flex items-center gap-5 z-50"><CheckCircle className="w-8 h-8" /><div><p className="font-medium font-bold text-sm  tracking-normal leading-none mb-1">Order Logged</p><p className="text-xs font-sans font-medium">Stock levels updated.</p></div></div>}
      </div>
    </div>
  );
};

export default SalesCalculator;