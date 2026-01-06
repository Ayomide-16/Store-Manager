
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
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, quantity: 1 }];
    });
    setSearchTerm('');
  };

  const updateQuantity = (id: string, delta: number) => {
    const item = items.find(i => i.id === id)!;
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        // Use 0.25 steps for fractional items, 1 for others
        const step = item.allowFractional ? 0.25 : 1;
        const newQty = Math.max(step, Math.min(item.quantityInStock, i.quantity + (delta * step)));
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const setFixedQuantity = (id: string, qty: number) => {
    const item = items.find(i => i.id === id)!;
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const finalQty = Math.min(item.quantityInStock, qty);
        return { ...i, quantity: finalQty };
      }
      return i;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleCompleteSale = () => {
    if (cart.length === 0 || !paymentMethod) return;
    addSale({ items: cart, paymentMethod, additionalCharges });
    setCart([]);
    setPaymentMethod(null);
    setAdditionalCharges(0);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
      {/* Product Selection & Cart */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Search products by name or SKU..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              value={searchTerm}
              onFocus={e => e.target.select()}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {searchTerm && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
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
                    {item.allowFractional && <Scissors className="w-3.5 h-3.5 text-indigo-400" title="Supports fractional selling" />}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600">{formatCurrency(item.sellingPrice)}</p>
                    <Plus className="w-4 h-4 ml-auto mt-1 text-indigo-400 group-hover:text-indigo-600" />
                  </div>
                </button>
              ))}
              {filteredItems.length === 0 && (
                <p className="text-center py-4 text-slate-400 text-sm">No items found matching "{searchTerm}"</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Cart ({cart.length} items)
            </h3>
            <button 
              onClick={() => setCart([])}
              className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
            >
              CLEAR ALL
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-[300px]">
            {cartDetails.map(item => (
              <div key={item.id} className="p-4 border-b border-slate-100 flex flex-col gap-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 leading-tight">{item.name}</p>
                      {item.allowFractional && <Scissors className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <p className="text-xs text-slate-500">{formatCurrency(item.sellingPrice)} per {item.unit}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input 
                        type="number" 
                        step={item.allowFractional ? "0.25" : "1"}
                        className="w-16 text-center font-bold text-slate-900 bg-white border border-slate-200 rounded-lg py-1 outline-none"
                        value={item.cartQuantity}
                        onChange={(e) => setFixedQuantity(item.id, Number(e.target.value))}
                      />
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        disabled={item.cartQuantity >= item.quantityInStock}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="w-24 text-right font-black text-slate-900">
                    {formatCurrency(item.sellingPrice * item.cartQuantity)}
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                {/* QUICK FRACTION BUTTONS */}
                {item.allowFractional && (
                  <div className="flex gap-2 pl-2">
                    {[
                      { label: '1/4', val: 0.25 },
                      { label: '1/2', val: 0.5 },
                      { label: '3/4', val: 0.75 },
                      { label: 'Full', val: 1.0 }
                    ].map(fraction => (
                      <button
                        key={fraction.label}
                        onClick={() => setFixedQuantity(item.id, fraction.val)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                          item.cartQuantity === fraction.val 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                        }`}
                      >
                        {fraction.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center p-12 text-slate-400 opacity-40">
                <ShoppingCart className="w-16 h-16 mb-4" />
                <p className="font-medium">Your cart is empty</p>
              </div>
            )}
          </div>
          <div className="p-6 bg-slate-50 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Subtotal</span>
              <span className="text-xl font-bold text-slate-900">{formatCurrency(subtotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sale Summary & Payment */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 sticky top-24">
          <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-4">Sale Summary</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(PaymentMethod).map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`px-3 py-3 rounded-xl border text-[10px] font-bold uppercase transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === method 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {method === PaymentMethod.CASH && <Wallet className="w-5 h-5" />}
                    {method === PaymentMethod.BANK_TRANSFER && <CheckCircle className="w-5 h-5" />}
                    {method === PaymentMethod.CARD && <CreditCard className="w-5 h-5" />}
                    {method.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Additional Charges (e.g. POS Fee)</label>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setAdditionalCharges(prev => Math.max(0, prev - 5))}
                  className="p-2 bg-slate-100 rounded-lg"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input 
                  type="number"
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-900 outline-none"
                  value={additionalCharges}
                  onFocus={e => e.target.select()}
                  onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                />
                <button 
                  onClick={() => setAdditionalCharges(prev => prev + 5)}
                  className="p-2 bg-slate-100 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-xl shadow-indigo-600/20">
            <p className="text-indigo-100 text-sm font-medium mb-1">Grand Total</p>
            <h4 className="text-4xl font-extrabold">{formatCurrency(total)}</h4>
          </div>

          <button
            onClick={handleCompleteSale}
            disabled={cart.length === 0 || !paymentMethod}
            className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-600/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            COMPLETE SALE
          </button>
        </div>

        {showSuccess && (
          <div className="fixed bottom-8 right-8 bg-emerald-100 border border-emerald-200 text-emerald-800 p-4 rounded-xl shadow-2xl animate-in fade-in slide-in-from-right-4 flex items-center gap-3 z-50">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
            <p className="font-bold text-sm">Sale completed successfully!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesCalculator;
