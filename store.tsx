
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  User, UserRole, Item, Category, Sale, SaleItem, 
  ChatMessage, SaleStatus, PaymentMethod, InventoryLog,
  POSWithdrawalFloat, POSWithdrawalTransaction, POSCashTransfer, POSChargeTier,
  Restock, RestockItem
} from './types';
import { generateSaleNumber, generateSKU } from './utils';
import { supabase, supabaseAdmin } from './lib/supabase/client';
import { signIn, signUp, signOut, updatePassword } from './lib/supabase/auth';

interface ShopContextType {
  currentUser: User | null;
  users: User[];
  shopName: string;
  items: Item[];
  categories: Category[];
  sales: Sale[];
  saleItems: SaleItem[];
  inventoryLogs: InventoryLog[];
  chatHistory: ChatMessage[];
  posFloats: POSWithdrawalFloat[];
  posTransactions: POSWithdrawalTransaction[];
  posTransfers: POSCashTransfer[];
  posChargeTiers: POSChargeTier[];
  restocks: Restock[];
  restockItems: RestockItem[];
  isLoading: boolean;
  error: string | null;
  digitalBalance: number;
  clearError: () => void;
  triggerAlert: (title: string, message: string, variant?: 'danger' | 'warning' | 'info') => void;
  
  login: (email: string, password: string) => Promise<void>;
  register: (params: { email: string; password: string; fullName: string; shopName: string }) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  addUser: (user: Partial<User> & { password?: string }) => Promise<void>;
  syncUsers: () => Promise<void>;
  updateUserAccount: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUserAccount: (id: string) => Promise<void>;
  addItem: (item: Partial<Item>) => Promise<void>;
  addSale: (saleData: { items: any[], paymentMethod: PaymentMethod, additionalCharges: number }) => Promise<void>;
  startPOSFloat: (openingBalance: number) => Promise<void>;
  addPOSTransaction: (data: any) => Promise<string>;
  addPOSTransfer: (amount: number, source: 'shop_cash' | 'external') => void;
  addCategory: (name: string) => Promise<string>;
  addChatMessage: (message: string, response: string) => void;
  deleteItem: (id: string) => void;
  clearInventory: () => Promise<void>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  deletePOSTransaction: (id: string) => void;
  returnSale: (id: string, reason: string) => void;
  addItems: (items: Partial<Item>[]) => Promise<void>;
  bulkUpdateItems: (ids: string[], updates: Partial<Item>) => void;
  resetPOSTiersToDefault: () => void;
  clearPOSTiers: () => void;
  addPOSChargeTier: (tier: Partial<POSChargeTier>) => void;
  updatePOSChargeTier: (id: string, tier: Partial<POSChargeTier>) => void;
  deletePOSChargeTier: (id: string) => void;
  addRestock: (data: { supplierName: string; items: any[] }) => void;
  processAdditiveRestockCSV: (csvData: any[]) => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

const DEFAULT_POS_TIERS: POSChargeTier[] = [
  { id: 't1', minAmount: 100, maxAmount: 1000, chargeAmount: 50, isActive: true },
  { id: 't2', minAmount: 1001, maxAmount: 5000, chargeAmount: 100, isActive: true },
  { id: 't3', minAmount: 5001, maxAmount: 10000, chargeAmount: 200, isActive: true },
  { id: 't4', minAmount: 10001, maxAmount: 20000, chargeAmount: 400, isActive: true }
];

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [shopName, setShopName] = useState<string>('NaijaShop');
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [posFloats, setPosFloats] = useState<POSWithdrawalFloat[]>([]);
  const [posTransactions, setPosTransactions] = useState<POSWithdrawalTransaction[]>([]);
  const [posTransfers, setPosTransfers] = useState<POSCashTransfer[]>([]);
  const [posChargeTiers, setPosChargeTiers] = useState<POSChargeTier[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [chatHistory, setChatMessage] = useState<ChatMessage[]>([]);
  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Consolidated digital account balance (Bank Transfer + Card)
  const digitalBalance = (
    sales.filter(s => s.status === SaleStatus.COMPLETED && s.paymentMethod !== PaymentMethod.CASH)
         .reduce((acc, s) => acc + s.totalAmount, 0) +
    posTransactions.reduce((acc, t) => acc + t.totalPaid, 0)
  );

  const clearError = () => setError(null);

  const triggerAlert = (title: string, message: string, variant: 'danger' | 'warning' | 'info' = 'danger') => {
    setError(`${title}: ${message}`);
  };

  const syncUsers = useCallback(async () => {
    try {
      setError(null);
      const { data, error: adminError } = await supabaseAdmin.auth.admin.listUsers();
      if (adminError) throw adminError;
      
      if (data?.users) {
        setUsers(data.users.map(u => ({
          id: u.id,
          email: u.email || '',
          fullName: u.user_metadata?.full_name || 'Staff Member',
          role: (u.user_metadata?.role as UserRole) || UserRole.SALESPERSON,
          createdAt: u.created_at
        })));
      }
    } catch (err: any) {
      const msg = err.message === 'Failed to fetch' 
        ? 'Database connection error. Your Supabase project might be paused or unreachable.'
        : (err.message || JSON.stringify(err));
      console.error('User Sync Error:', msg);
      setError(msg);
    }
  }, []);

  const mapItemFromDB = (item: any): Item => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    categoryId: item.category_id,
    unit: item.unit,
    costPrice: item.cost_price,
    sellingPrice: item.selling_price,
    quantityInStock: item.quantity_in_stock,
    reorderLevel: item.reorder_level,
    allowFractional: item.allow_fractional === true,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  });

  const mapSaleFromDB = (sale: any): Sale => ({
    id: sale.id,
    saleNumber: sale.sale_number,
    status: sale.status,
    subtotal: sale.subtotal,
    additional_charges: sale.additional_charges,
    total_amount: sale.total_amount,
    profit_amount: sale.profit_amount,
    payment_method: sale.payment_method,
    createdBy: sale.created_by,
    saleDate: sale.sale_date,
    createdAt: sale.created_at,
    updatedAt: sale.updated_at
  });

  const mapSaleItemFromDB = (si: any): SaleItem => ({
    id: si.id,
    saleId: si.sale_id,
    itemId: si.item_id,
    itemName: si.item_name,
    quantity: si.quantity,
    unitPrice: si.unit_price,
    costPrice: si.cost_price,
    lineTotal: si.line_total,
    profitMargin: si.profit_margin,
    createdAt: si.created_at
  });

  const mapFloatFromDB = (f: any): POSWithdrawalFloat => ({
    id: f.id,
    date: f.date,
    openingBalance: f.opening_balance,
    currentBalance: f.current_balance,
    closingBalance: f.closing_balance,
    totalWithdrawalsProcessed: f.total_withdrawals_processed,
    totalChargesEarned: f.total_charges_earned,
    status: f.status,
    createdBy: f.created_by,
    createdAt: f.created_at,
    updatedAt: f.updated_at
  });

  const mapTxFromDB = (tx: any): POSWithdrawalTransaction => ({
    id: tx.id,
    floatId: tx.float_id,
    transaction_number: tx.transaction_number,
    customerName: tx.customer_name,
    withdrawalAmount: tx.withdrawal_amount,
    serviceCharge: tx.service_charge,
    totalPaid: tx.total_paid,
    paymentMethod: tx.payment_method,
    createdBy: tx.created_by,
    transactionDate: tx.transaction_date,
    createdAt: tx.created_at
  });

  const mapTransferFromDB = (t: any): POSCashTransfer => ({
    id: t.id,
    floatId: t.float_id,
    amount: t.amount,
    source: t.source,
    transferredBy: t.transferred_by,
    createdAt: t.created_at
  });

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const metadata = session.user.user_metadata;
          setCurrentUser({
            id: session.user.id,
            email: session.user.email || '',
            fullName: metadata.full_name || 'User',
            role: metadata.role || UserRole.SALESPERSON,
            createdAt: session.user.created_at
          });
          if (metadata.shop_name) setShopName(metadata.shop_name);
        }
      } catch (err: any) {
        console.error('Session Init Error:', err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const metadata = session.user.user_metadata;
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || '',
          fullName: metadata.full_name || 'User',
          role: metadata.role || UserRole.SALESPERSON,
          createdAt: session.user.created_at
        });
        if (metadata.shop_name) setShopName(metadata.shop_name);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      const fetchData = async () => {
        try {
          const [
            { data: itemsData },
            { data: catsData },
            { data: salesData },
            { data: saleItemsData },
            { data: floatsData },
            { data: txsData },
            { data: transfersData },
            { data: tiersData }
          ] = await Promise.all([
            supabase.from('items').select('*'),
            supabase.from('categories').select('*'),
            supabase.from('sales').select('*').order('created_at', { ascending: false }),
            supabase.from('sale_items').select('*'),
            supabase.from('pos_floats').select('*').order('date', { ascending: false }),
            supabase.from('pos_transactions').select('*').order('created_at', { ascending: false }),
            supabase.from('pos_transfers').select('*'),
            supabase.from('pos_charge_tiers').select('*')
          ]);
          
          if (currentUser.role === UserRole.ADMIN) {
             await syncUsers();
          }

          if (itemsData) setItems(itemsData.map(mapItemFromDB));
          if (catsData) setCategories(catsData);
          if (salesData) setSales(salesData.map(mapSaleFromDB));
          if (saleItemsData) setSaleItems(saleItemsData.map(mapSaleItemFromDB));
          if (floatsData) setPosFloats(floatsData.map(mapFloatFromDB));
          if (txsData) setPosTransactions(txsData.map(mapTxFromDB));
          if (transfersData) setPosTransfers(transfersData.map(mapTransferFromDB));
          if (tiersData) setPosChargeTiers(tiersData.length > 0 ? tiersData : DEFAULT_POS_TIERS);
        } catch (err: any) {
          console.error("Critical data fetch error:", err.message);
          if (err.message === 'Failed to fetch') {
            setError('System could not reach the server. Please check your internet or Supabase project status.');
          } else {
            setError(err.message || JSON.stringify(err));
          }
        }
      };
      fetchData();
    }
  }, [currentUser, syncUsers]);

  const login = async (email: string, password: string) => {
    const { error: authError } = await signIn({ email, password });
    if (authError) throw authError;
  };

  const register = async ({ email, password, fullName, shopName }: any) => {
    const { error: authError } = await signUp({ 
      email, 
      password, 
      fullName, 
      role: UserRole.ADMIN,
      shopName
    });
    if (authError) throw authError;
  };

  const logout = async () => {
    await signOut();
    setCurrentUser(null);
  };

  const changePassword = async (newPassword: string) => {
    const { error: updateError } = await updatePassword(newPassword);
    if (updateError) throw updateError;
  };

  const addUser = async (userData: Partial<User> & { password?: string }) => {
    const { error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email!,
      password: userData.password || 'NaijaShop2024!',
      user_metadata: {
        full_name: userData.fullName,
        role: userData.role || UserRole.SALESPERSON,
        shop_name: shopName
      },
      email_confirm: true 
    });

    if (adminError) throw adminError;
    await syncUsers();
  };

  const updateUserAccount = async (id: string, updates: Partial<User>) => {
    const { error: adminError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      email: updates.email,
      user_metadata: {
        full_name: updates.fullName,
        role: updates.role,
        shop_name: shopName 
      }
    });

    if (adminError) throw adminError;
    await syncUsers();
  };

  const deleteUserAccount = async (id: string) => {
    try {
      const { error: adminError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (adminError) throw adminError;
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err: any) {
      console.error("User deletion error:", err.message);
      throw err;
    }
  };

  const addItem = async (itemData: Partial<Item>) => {
    const sku = itemData.sku || generateSKU(itemData.name || 'ITM');
    
    // Fix: Using correct camelCase properties from Partial<Item>
    const payload: any = {
      name: itemData.name,
      sku,
      category_id: itemData.categoryId || null,
      unit: itemData.unit || 'pcs',
      cost_price: itemData.costPrice || 0,
      selling_price: itemData.sellingPrice || 0,
      quantity_in_stock: itemData.quantityInStock || 0,
      reorder_level: itemData.reorderLevel || 5,
      allow_fractional: itemData.allowFractional === true
    };

    const { data, error: itemError } = await supabase
      .from('items')
      .insert(payload)
      .select()
      .single();

    if (itemError) throw itemError;
    if (data) setItems(prev => [mapItemFromDB(data), ...prev]);
  };

  const clearInventory = async () => {
    try {
      const { error: clearError } = await supabase.from('items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (clearError) throw clearError;
      setItems([]);
    } catch (err: any) {
      throw err;
    }
  };

  const addItems = async (newItems: Partial<Item>[]) => {
    if (!newItems || newItems.length === 0) return;

    // Fix: Using correct camelCase properties from Partial<Item>
    const prepared = newItems.map(itemData => ({
      name: itemData.name,
      sku: itemData.sku || generateSKU(itemData.name || 'ITM'),
      category_id: itemData.categoryId || null,
      unit: itemData.unit || 'pcs',
      cost_price: itemData.costPrice || 0,
      selling_price: itemData.sellingPrice || 0,
      quantity_in_stock: itemData.quantityInStock || 0,
      reorder_level: 5,
      allow_fractional: itemData.allowFractional === true
    }));

    const { data, error: itemsError } = await supabase.from('items').insert(prepared).select();
    if (itemsError) throw itemsError;

    if (data) {
      setItems(prev => [...prev, ...data.map(mapItemFromDB)]);
    }
  };

  const updateItem = async (id: string, updates: Partial<Item>) => {
    const payload: any = {
      updated_at: new Date().toISOString()
    };
    
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.categoryId !== undefined) payload.category_id = updates.categoryId || null;
    if (updates.costPrice !== undefined) payload.cost_price = Number(updates.costPrice);
    if (updates.sellingPrice !== undefined) payload.selling_price = Number(updates.sellingPrice);
    if (updates.quantityInStock !== undefined) payload.quantity_in_stock = Number(updates.quantityInStock);
    if (updates.reorderLevel !== undefined) payload.reorder_level = Number(updates.reorderLevel);
    if (updates.unit !== undefined) payload.unit = updates.unit;
    if (updates.allowFractional !== undefined) payload.allow_fractional = updates.allowFractional === true;

    const { data, error: updateError } = await supabase
      .from('items')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    
    if (data) {
      const updatedItem = mapItemFromDB(data);
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
    }
  };

  const bulkUpdateItems = async (ids: string[], updates: Partial<Item>) => {
    const payload: any = {
      updated_at: new Date().toISOString()
    };
    
    if (updates.costPrice !== undefined) payload.cost_price = updates.costPrice;
    if (updates.sellingPrice !== undefined) payload.selling_price = updates.sellingPrice;
    // Fixed property name from allow_fractional to allowFractional
    if (updates.allowFractional !== undefined) payload.allow_fractional = updates.allowFractional;

    const { error: bulkError } = await supabase
      .from('items')
      .update(payload)
      .in('id', ids);

    if (bulkError) throw bulkError;
    setItems(prev => prev.map(item => ids.includes(item.id) ? { ...item, ...updates } : item));
  };

  const deleteItem = async (id: string) => {
    const { error: deleteError } = await supabase.from('items').delete().eq('id', id);
    if (deleteError) throw deleteError;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const addCategory = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return '';
    const existing = categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (existing) return existing.id;
    const { data, error: catError } = await supabase.from('categories').upsert({ name: trimmedName }, { onConflict: 'name' }).select().single();
    if (catError) {
      const { data: fetched } = await supabase.from('categories').select('id').eq('name', trimmedName).single();
      if (fetched) return fetched.id;
      throw catError;
    }
    if (data) {
      setCategories(prev => [...prev, data]);
      return data.id;
    }
    return '';
  };

  const addSale = async (data: any) => {
    const saleNumber = generateSaleNumber();
    let subtotal = 0;
    let totalProfit = 0;

    const itemsToUpdate = data.items.map((cartItem: any) => {
      const originalItem = items.find(i => i.id === cartItem.id)!;
      const lineTotal = originalItem.sellingPrice * cartItem.quantity;
      const profit = (originalItem.sellingPrice - originalItem.costPrice) * cartItem.quantity;
      subtotal += lineTotal;
      totalProfit += profit;
      return { ...cartItem, originalItem, lineTotal, profit, newStock: originalItem.quantityInStock - cartItem.quantity };
    });

    const { data: saleData, error: saleError } = await supabase.from('sales').insert({
      sale_number: saleNumber,
      status: SaleStatus.COMPLETED,
      subtotal,
      additional_charges: data.additionalCharges,
      total_amount: subtotal + data.additionalCharges,
      profit_amount: totalProfit,
      payment_method: data.payment_method,
      created_by: currentUser?.id,
      sale_date: new Date().toISOString().split('T')[0]
    }).select().single();

    if (saleError) throw saleError;

    const saleItemsPayload = itemsToUpdate.map((i: any) => ({
      sale_id: saleData.id,
      item_id: i.id,
      item_name: i.originalItem.name,
      quantity: i.quantity,
      unit_price: i.originalItem.sellingPrice,
      cost_price: i.originalItem.costPrice,
      line_total: i.lineTotal,
      profit_margin: ((i.originalItem.sellingPrice - i.originalItem.costPrice) / i.originalItem.sellingPrice) * 100
    }));

    const { data: siData, error: siError } = await supabase.from('sale_items').insert(saleItemsPayload).select();
    if (siError) throw siError;

    for (const i of itemsToUpdate) {
      await updateItem(i.id, { quantityInStock: i.newStock });
    }

    if (saleData) setSales(prev => [mapSaleFromDB(saleData), ...prev]);
    if (siData) setSaleItems(prev => [...prev, ...siData.map(mapSaleItemFromDB)]);
  };

  const returnSale = async (id: string, reason: string) => {
    const { data: saleData, error: saleError } = await supabase.from('sales').update({ status: SaleStatus.RETURNED, return_reason: reason, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (saleError) throw saleError;
    const itemsToRestore = saleItems.filter(si => si.saleId === id);
    for (const si of itemsToRestore) {
      const item = items.find(i => i.id === si.itemId);
      if (item) await updateItem(item.id, { quantityInStock: item.quantityInStock + si.quantity });
    }
    if (saleData) setSales(prev => prev.map(s => s.id === id ? mapSaleFromDB(saleData) : s));
  };

  const startPOSFloat = async (openingBalance: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const { data, error: floatError } = await supabase.from('pos_floats').insert({
      date: todayStr,
      opening_balance: openingBalance,
      current_balance: openingBalance,
      status: 'active',
      created_by: currentUser?.id
    }).select().single();
    if (floatError) throw floatError;
    await supabase.from('pos_transfers').insert({ float_id: data.id, amount: openingBalance, source: 'external', transferred_by: currentUser?.id });
    if (data) setPosFloats(prev => [mapFloatFromDB(data), ...prev]);
  };

  const addPOSTransaction = async (data: any): Promise<string> => {
    const todayStr = new Date().toISOString().split('T')[0];
    const active = posFloats.find(f => f.status === 'active' && f.date === todayStr);
    if (!active) throw new Error("No active float for today");
    if (active.currentBalance < data.withdrawalAmount) throw new Error(`Insufficient cash in POS. Current balance: ₦${active.currentBalance.toLocaleString()}`);

    const { data: txData, error: txError } = await supabase.from('pos_transactions').insert({
      float_id: active.id,
      transaction_number: `POS-${Date.now()}`,
      customer_name: data.customerName,
      withdrawal_amount: data.withdrawalAmount,
      service_charge: data.serviceCharge,
      total_paid: data.withdrawalAmount + data.serviceCharge,
      payment_method: data.payment_method,
      created_by: currentUser?.id,
      transaction_date: new Date().toISOString()
    }).select().single();
    
    if (txError) throw txError;
    const newBalance = active.currentBalance - data.withdrawalAmount;
    const { data: updatedFloat } = await supabase.from('pos_floats').update({ 
      current_balance: newBalance,
      total_withdrawals_processed: active.totalWithdrawalsProcessed + 1,
      total_charges_earned: active.totalChargesEarned + data.serviceCharge,
      updated_at: new Date().toISOString()
    }).eq('id', active.id).select().single();
    if (txData) setPosTransactions(prev => [mapTxFromDB(txData), ...prev]);
    if (updatedFloat) setPosFloats(prev => prev.map(f => f.id === active.id ? mapFloatFromDB(updatedFloat) : f));
    return txData.transaction_number;
  };

  const addPOSTransfer = async (amount: number, source: 'shop_cash' | 'external') => {
    const todayStr = new Date().toISOString().split('T')[0];
    const active = posFloats.find(f => f.status === 'active' && f.date === todayStr);
    if (!active) return;
    const { data, error: transferError } = await supabase.from('pos_transfers').insert({ float_id: active.id, amount, source, transferred_by: currentUser?.id }).select().single();
    if (transferError) throw transferError;
    const newBalance = active.currentBalance + amount;
    const { data: updatedFloat } = await supabase.from('pos_floats').update({ current_balance: newBalance, updated_at: new Date().toISOString() }).eq('id', active.id).select().single();
    if (data) setPosTransfers(prev => [...prev, mapTransferFromDB(data)]);
    if (updatedFloat) setPosFloats(prev => prev.map(f => f.id === active.id ? mapFloatFromDB(updatedFloat) : f));
  };

  const deletePOSTransaction = async (id: string) => {
    const tx = posTransactions.find(t => t.id === id);
    if (!tx) return;
    const { error: deleteError } = await supabase.from('pos_transactions').delete().eq('id', id);
    if (deleteError) throw deleteError;
    const float = posFloats.find(f => f.id === tx.floatId);
    if (float) {
      const { data: updatedFloat } = await supabase.from('pos_floats').update({
        current_balance: float.currentBalance + tx.withdrawalAmount,
        total_withdrawals_processed: float.totalWithdrawalsProcessed - 1,
        total_charges_earned: float.totalChargesEarned - tx.serviceCharge,
        updated_at: new Date().toISOString()
      }).eq('id', float.id).select().single();
      if (updatedFloat) setPosFloats(prev => prev.map(f => f.id === float.id ? mapFloatFromDB(updatedFloat) : f));
    }
    setPosTransactions(prev => prev.filter(t => t.id !== id));
  };

  const resetPOSTiersToDefault = async () => {
    await clearPOSTiers();
    const { data } = await supabase.from('pos_charge_tiers').insert(DEFAULT_POS_TIERS.map(t => ({ min_amount: t.minAmount, max_amount: t.maxAmount, charge_amount: t.chargeAmount, is_active: true }))).select();
    if (data) setPosChargeTiers(data.map(t => ({ id: t.id, minAmount: t.min_amount, maxAmount: t.max_amount, chargeAmount: t.charge_amount, isActive: t.is_active })));
  };

  const clearPOSTiers = async () => {
    await supabase.from('pos_charge_tiers').delete().neq('id', '0');
    setPosChargeTiers([]);
  };

  const addPOSChargeTier = async (tier: Partial<POSChargeTier>) => {
    const { data } = await supabase.from('pos_charge_tiers').insert({ min_amount: tier.minAmount, max_amount: tier.maxAmount, charge_amount: tier.chargeAmount, is_active: true }).select().single();
    if (data) setPosChargeTiers(prev => [...prev, { id: data.id, minAmount: data.min_amount, maxAmount: data.max_amount, chargeAmount: data.charge_amount, isActive: data.is_active }]);
  };

  const updatePOSChargeTier = async (id: string, updates: Partial<POSChargeTier>) => {
    const { data } = await supabase.from('pos_charge_tiers').update({ min_amount: updates.minAmount, max_amount: updates.maxAmount, charge_amount: updates.chargeAmount, is_active: updates.isActive }).eq('id', id).select().single();
    if (data) setPosChargeTiers(prev => prev.map(t => t.id === id ? { id: data.id, minAmount: data.min_amount, maxAmount: data.max_amount, chargeAmount: data.charge_amount, isActive: data.is_active } : t));
  };

  const deletePOSChargeTier = async (id: string) => {
    await supabase.from('pos_charge_tiers').delete().eq('id', id);
    setPosChargeTiers(prev => prev.filter(t => t.id !== id));
  };

  const addRestock = async (data: { supplierName: string; items: any[] }) => {
    const { data: restockHead, error: restockError } = await supabase.from('restocks').insert({
      supplier_name: data.supplierName,
      restock_date: new Date().toISOString().split('T')[0],
      total_amount: data.items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0),
      created_by: currentUser?.id
    }).select().single();
    if (restockError) throw restockError;
    const restockItemsPayload = data.items.map(ri => ({ restock_id: restockHead.id, item_id: ri.id, quantity: ri.quantity, unit_cost: ri.unit_cost }));
    await supabase.from('restock_items').insert(restockItemsPayload);
    for (const ri of data.items) {
      const item = items.find(i => i.id === ri.id);
      if (item) await updateItem(item.id, { quantityInStock: item.quantityInStock + ri.quantity, costPrice: ri.unitCost });
    }
  };

  const processAdditiveRestockCSV = async (csvData: any[]) => {
    for (const row of csvData) {
      const name = row['Item'];
      const catName = row['Category'];
      const sellPrice = Number(row['Selling Price (₦)']);
      const costPrice = Number(row['Cost Price (₦)']);
      const qtyInCSV = Number(row['Quantity']);
      
      if (!name || isNaN(qtyInCSV) || qtyInCSV <= 0) continue;
      
      const existingItem = items.find(i => i.name.toLowerCase().trim() === name.toLowerCase().trim());
      
      if (existingItem) {
        await updateItem(existingItem.id, { 
          quantityInStock: existingItem.quantityInStock + qtyInCSV, 
          costPrice: costPrice || existingItem.costPrice, 
          sellingPrice: sellPrice || existingItem.sellingPrice 
        });
      } else {
        const catId = await addCategory(catName || 'General');
        await addItem({ 
          name: name.trim(), 
          categoryId: catId, 
          unit: 'pcs', 
          costPrice: costPrice || 0, 
          sellingPrice: sellPrice || 0, 
          quantityInStock: qtyInCSV, 
          reorderLevel: 5, 
          allowFractional: false 
        });
      }
    }
  };

  const addChatMessage = (message: string, response: string) => {
    setChatMessage(prev => [...prev, { id: crypto.randomUUID(), userId: currentUser?.id || 'guest', message, response, createdAt: new Date().toISOString() }]);
  };

  return (
    <ShopContext.Provider value={{
      currentUser, users, shopName, items, categories, sales, saleItems, inventoryLogs, chatHistory,
      posFloats, posTransactions, posTransfers, posChargeTiers, restocks, restockItems, isLoading, error,
      digitalBalance, clearError, triggerAlert, login, register, logout, changePassword, addUser, syncUsers, updateUserAccount, deleteUserAccount, 
      addItem, updateItem, deleteItem, clearInventory, addSale, returnSale,
      startPOSFloat, addPOSTransaction, addPOSTransfer, addCategory, addChatMessage,
      addItems, bulkUpdateItems, resetPOSTiersToDefault, clearPOSTiers, addPOSChargeTier,
      updatePOSChargeTier, deletePOSChargeTier, deletePOSTransaction, addRestock, processAdditiveRestockCSV
    }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) throw new Error('useShop must be used within a ShopProvider');
  return context;
};
