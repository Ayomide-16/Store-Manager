
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

const DEFAULT_POS_TIERS: POSChargeTier[] = [
  { id: 't1', minAmount: 0, maxAmount: 5000, chargeAmount: 100, isActive: true },
  { id: 't2', minAmount: 5001, maxAmount: 10000, chargeAmount: 200, isActive: true },
  { id: 't3', minAmount: 10001, maxAmount: 20000, chargeAmount: 500, isActive: true },
  { id: 't4', minAmount: 20001, maxAmount: 50000, chargeAmount: 1000, isActive: true },
  { id: 't5', minAmount: 50001, maxAmount: 1000000, chargeAmount: 2000, isActive: true },
];

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
  triggerAlert: (title: string, message: any, variant?: 'danger' | 'warning' | 'info') => void;

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

// Improved getErrorMessage to prevent [object Object] in the UI and provide specific Postgres hints
const getErrorMessage = (err: any): string => {
  if (!err) return "Unknown error";
  if (typeof err === 'string') return err;

  let msg = "An unexpected error occurred.";

  // Postgrest / Supabase Error Object
  if (err.message && typeof err.message === 'string') {
    msg = err.message;
  } else if (err.error && typeof err.error === 'string') {
    msg = err.error;
  } else if (err.error_description && typeof err.error_description === 'string') {
    msg = err.error_description;
  } else if (err.error && typeof err.error === 'object' && err.error.message) {
    msg = err.error.message;
  } else if (err.details && typeof err.details === 'string') {
    msg = err.details;
  } else {
    try {
      const stringified = JSON.stringify(err);
      if (stringified === "{}" || stringified === "[]") {
        if (err.toString && err.toString() !== "[object Object]") {
          msg = err.toString();
        } else if (err.name) {
          msg = `${err.name}: ${err.message || 'No details'}`;
        }
      } else {
        msg = stringified;
      }
    } catch (e) {
      msg = String(err);
    }
  }

  // Handle specific Postgres integer syntax error for fractional items
  if (msg.includes('invalid input syntax for type integer') || msg.includes('invalid input syntax for integer')) {
    msg += ". \n\nNOTE: This error is likely caused by the 'quantity' or 'quantity_in_stock' columns being set to INTEGER in Supabase. Please change them to NUMERIC to support 0.5/0.25 quantities.";
  }

  return msg;
};

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
  const [posChargeTiers, setPosChargeTiers] = useState<POSChargeTier[]>(DEFAULT_POS_TIERS);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const digitalBalance = (
    sales.filter(s => s.status === SaleStatus.COMPLETED && s.paymentMethod !== PaymentMethod.CASH)
      .reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0) +
    posTransactions.reduce((acc, t) => acc + (Number(t.totalPaid) || 0), 0)
  );

  const clearError = () => setError(null);

  const triggerAlert = (title: string, message: any, variant: 'danger' | 'warning' | 'info' = 'danger') => {
    setError(`${title}: ${getErrorMessage(message)}`);
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
      const msg = getErrorMessage(err);
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
    costPrice: Number(item.cost_price),
    sellingPrice: Number(item.selling_price),
    quantityInStock: Number(item.quantity_in_stock),
    reorderLevel: Number(item.reorder_level),
    allowFractional: item.allow_fractional === true,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  });

  const mapSaleFromDB = (sale: any): Sale => ({
    id: sale.id,
    saleNumber: sale.sale_number,
    status: sale.status,
    subtotal: Number(sale.subtotal),
    additionalCharges: Number(sale.additional_charges),
    totalAmount: Number(sale.total_amount),
    profitAmount: Number(sale.profit_amount),
    paymentMethod: sale.payment_method,
    createdBy: sale.created_by,
    saleDate: sale.sale_date,
    createdAt: sale.created_at,
    updatedAt: sale.updated_at
  });

  const syncData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [itemsRes, salesRes, categoriesRes, posFloatsRes, posTxsRes, posTransfersRes, restocksRes] = await Promise.all([
        supabase.from('items').select('*').order('name'),
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
        supabase.from('pos_floats').select('*').order('created_at', { ascending: false }),
        supabase.from('pos_transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('pos_transfers').select('*').order('created_at', { ascending: false }),
        supabase.from('restocks').select('*').order('created_at', { ascending: false })
      ]);

      if (itemsRes.data) setItems(itemsRes.data.map(mapItemFromDB));
      if (salesRes.data) setSales(salesRes.data.map(mapSaleFromDB));
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (posFloatsRes.data) setPosFloats(posFloatsRes.data);
      if (posTxsRes.data) setPosTransactions(posTxsRes.data);
      if (posTransfersRes.data) setPosTransfers(posTransfersRes.data);
      if (restocksRes.data) setRestocks(restocksRes.data);

      await syncUsers();
    } catch (err: any) {
      triggerAlert('Sync Error', err);
    } finally {
      setIsLoading(false);
    }
  }, [syncUsers]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const user: User = {
          id: session.user.id,
          email: session.user.email!,
          fullName: session.user.user_metadata.full_name,
          role: session.user.user_metadata.role,
          createdAt: session.user.created_at
        };
        setCurrentUser(user);
        setShopName(session.user.user_metadata.shop_name || 'NaijaShop');
        syncData();
      } else {
        setIsLoading(false);
      }
    };
    checkUser();
  }, [syncData]);

  const login = async (email: string, password: string) => {
    const { data, error } = await signIn({ email, password });
    if (error) throw error;
    if (data?.user) {
      setCurrentUser({
        id: data.user.id,
        email: data.user.email!,
        fullName: data.user.user_metadata.full_name,
        role: data.user.user_metadata.role,
        createdAt: data.user.created_at
      });
      setShopName(data.user.user_metadata.shop_name || 'NaijaShop');
      syncData();
    }
  };

  const register = async (params: { email: string; password: string; fullName: string; shopName: string }) => {
    const { data, error } = await signUp({ ...params, role: UserRole.ADMIN });
    if (error) throw error;
    if (data?.user) {
      setCurrentUser({
        id: data.user.id,
        email: data.user.email!,
        fullName: data.user.user_metadata.full_name,
        role: data.user.user_metadata.role,
        createdAt: data.user.created_at
      });
      setShopName(params.shopName);
      syncData();
    }
  };

  const logout = async () => {
    await signOut();
    setCurrentUser(null);
  };

  const changePassword = async (newPassword: string) => {
    const { error } = await updatePassword(newPassword);
    if (error) throw error;
  };

  const addUser = async (user: Partial<User> & { password?: string }) => {
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.fullName, role: user.role, shop_name: shopName }
    });
    if (error) throw error;
    syncUsers();
  };

  const updateUserAccount = async (id: string, updates: Partial<User>) => {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: { full_name: updates.fullName, role: updates.role }
    });
    if (error) throw error;
    syncUsers();
  };

  const deleteUserAccount = async (id: string) => {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;
    syncUsers();
  };

  const addItem = async (item: Partial<Item>) => {
    const { data, error } = await supabase.from('items').insert({
      name: item.name,
      sku: item.sku || generateSKU(item.name || 'ITEM'),
      category_id: item.categoryId,
      unit: item.unit,
      cost_price: item.costPrice,
      selling_price: item.sellingPrice,
      quantity_in_stock: item.quantityInStock,
      reorder_level: item.reorderLevel,
      allow_fractional: item.allowFractional
    }).select().single();
    if (error) throw error;
    setItems(prev => [...prev, mapItemFromDB(data)]);
  };

  const addSale = async (saleData: { items: any[], paymentMethod: PaymentMethod, additionalCharges: number }) => {
    if (!currentUser) return;
    const saleNumber = generateSaleNumber();

    let subtotal = 0;
    let totalCost = 0;

    const itemsToInsert = saleData.items.map(cartItem => {
      const item = items.find(i => i.id === cartItem.id)!;
      subtotal += item.sellingPrice * cartItem.quantity;
      totalCost += item.costPrice * cartItem.quantity;
      return {
        item_id: item.id,
        item_name: item.name,
        quantity: cartItem.quantity,
        unit_price: item.sellingPrice,
        cost_price: item.costPrice,
        line_total: item.sellingPrice * cartItem.quantity,
        profit_margin: ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100
      };
    });

    const totalAmount = subtotal + saleData.additionalCharges;
    const profitAmount = totalAmount - totalCost;

    const { data: sale, error: saleErr } = await supabase.from('sales').insert({
      sale_number: saleNumber,
      status: SaleStatus.COMPLETED,
      subtotal,
      additional_charges: saleData.additionalCharges,
      total_amount: totalAmount,
      profit_amount: profitAmount,
      payment_method: saleData.payment_method,
      created_by: currentUser.id,
      sale_date: new Date().toISOString().split('T')[0]
    }).select().single();

    if (saleErr) throw saleErr;

    const { error: itemsErr } = await supabase.from('sale_items').insert(
      itemsToInsert.map(si => ({ ...si, sale_id: sale.id }))
    );

    if (itemsErr) throw itemsErr;

    // Deduct sold quantities from inventory
    for (const cartItem of saleData.items) {
      const item = items.find(i => i.id === cartItem.id)!;
      const newStock = item.quantityInStock - cartItem.quantity;
      await supabase
        .from('items')
        .update({ quantity_in_stock: newStock })
        .eq('id', cartItem.id);
    }

    // Simplified sync
    syncData();
  };

  const activeFloat = posFloats.find(f => f.status === 'active');

  const startPOSFloat = async (openingBalance: number) => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase.from('pos_floats').insert({
      date: today,
      opening_balance: openingBalance,
      current_balance: openingBalance,
      status: 'active',
      created_by: currentUser.id
    }).select().single();
    if (error) throw error;
    setPosFloats(prev => [data, ...prev]);
  };

  const addPOSTransaction = async (data: any) => {
    if (!currentUser || !activeFloat) throw new Error("No active float found");
    const txNum = `POS-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const totalPaid = data.withdrawalAmount + data.serviceCharge;

    const { error } = await supabase.from('pos_transactions').insert({
      float_id: activeFloat.id,
      transaction_number: txNum,
      customer_name: data.customerName,
      withdrawal_amount: data.withdrawalAmount,
      service_charge: data.serviceCharge,
      total_paid: totalPaid,
      payment_method: data.paymentMethod,
      created_by: currentUser.id,
      transaction_date: new Date().toISOString()
    });

    if (error) throw error;

    syncData();
    return txNum;
  };

  const addPOSTransfer = async (amount: number, source: 'shop_cash' | 'external') => {
    if (!currentUser || !activeFloat) return;
    const { error } = await supabase.from('pos_transfers').insert({
      float_id: activeFloat.id,
      amount,
      source,
      transferred_by: currentUser.id
    });
    if (error) throw error;
    syncData();
  };

  const addCategory = async (name: string) => {
    const { data, error } = await supabase.from('categories').insert({ name }).select().single();
    if (error) throw error;
    setCategories(prev => [...prev, data]);
    return data.id;
  };

  const addChatMessage = (message: string, response: string) => {
    if (!currentUser) return;
    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      userId: currentUser.id,
      message,
      response,
      createdAt: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, newMessage]);
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) throw error;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const clearInventory = async () => {
    const { error } = await supabase.from('items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    setItems([]);
  };

  const updateItem = async (id: string, updates: Partial<Item>) => {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.sku) dbUpdates.sku = updates.sku;
    if (updates.categoryId) dbUpdates.category_id = updates.categoryId;
    if (updates.unit) dbUpdates.unit = updates.unit;
    if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
    if (updates.sellingPrice !== undefined) dbUpdates.selling_price = updates.sellingPrice;
    if (updates.quantityInStock !== undefined) dbUpdates.quantity_in_stock = updates.quantityInStock;
    if (updates.reorderLevel !== undefined) dbUpdates.reorder_level = updates.reorderLevel;
    if (updates.allowFractional !== undefined) dbUpdates.allow_fractional = updates.allowFractional;

    const { error } = await supabase.from('items').update(dbUpdates).eq('id', id);
    if (error) throw error;
    syncData();
  };

  const deletePOSTransaction = async (id: string) => {
    const { error } = await supabase.from('pos_transactions').delete().eq('id', id);
    if (error) throw error;
    syncData();
  };

  const returnSale = async (id: string, reason: string) => {
    const { error } = await supabase.from('sales').update({
      status: SaleStatus.RETURNED,
      return_reason: reason
    }).eq('id', id);
    if (error) throw error;
    syncData();
  };

  const addItems = async (newItems: Partial<Item>[]) => {
    const dbItems = newItems.map(item => ({
      name: item.name,
      sku: item.sku || generateSKU(item.name || 'ITEM'),
      category_id: item.categoryId,
      unit: item.unit,
      cost_price: item.costPrice,
      selling_price: item.sellingPrice,
      quantity_in_stock: item.quantityInStock,
      reorder_level: item.reorderLevel,
      allow_fractional: item.allowFractional
    }));
    const { error } = await supabase.from('items').insert(dbItems);
    if (error) throw error;
    syncData();
  };

  const bulkUpdateItems = async (ids: string[], updates: Partial<Item>) => {
    const dbUpdates: any = {};
    if (updates.categoryId) dbUpdates.category_id = updates.categoryId;
    if (updates.reorderLevel !== undefined) dbUpdates.reorder_level = updates.reorderLevel;

    const { error } = await supabase.from('items').update(dbUpdates).in('id', ids);
    if (error) throw error;
    syncData();
  };

  const resetPOSTiersToDefault = () => setPosChargeTiers(DEFAULT_POS_TIERS);
  const clearPOSTiers = () => setPosChargeTiers([]);
  const addPOSChargeTier = (tier: Partial<POSChargeTier>) => {
    const newTier = { ...tier, id: Math.random().toString(36).substring(7), isActive: true } as POSChargeTier;
    setPosChargeTiers(prev => [...prev, newTier]);
  };
  const updatePOSChargeTier = (id: string, updates: Partial<POSChargeTier>) => {
    setPosChargeTiers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };
  const deletePOSChargeTier = (id: string) => {
    setPosChargeTiers(prev => prev.filter(t => t.id !== id));
  };

  const addRestock = async (data: { supplierName: string; items: any[] }) => {
    if (!currentUser) return;
    const { data: restock, error: restockErr } = await supabase.from('restocks').insert({
      supplier_name: data.supplierName,
      restock_date: new Date().toISOString().split('T')[0],
      total_amount: data.items.reduce((acc, i) => acc + (i.quantity * i.unitCost), 0),
      created_by: currentUser.id
    }).select().single();

    if (restockErr) throw restockErr;

    const restockItemsData = data.items.map(ri => ({
      restock_id: restock.id,
      item_id: ri.id,
      quantity: ri.quantity,
      unit_cost: ri.unitCost
    }));

    const { error: itemsErr } = await supabase.from('restock_items').insert(restockItemsData);
    if (itemsErr) throw itemsErr;
    syncData();
  };

  const processAdditiveRestockCSV = async (csvData: any[]) => {
    for (const row of csvData) {
      const item = items.find(i => i.name.toLowerCase() === row.Item?.toLowerCase());
      if (item && row['Quantity Bought']) {
        await addRestock({
          supplierName: 'Bulk Upload',
          items: [{ id: item.id, quantity: Number(row['Quantity Bought']), unitCost: item.costPrice }]
        });
      }
    }
  };

  return (
    <ShopContext.Provider value={{
      currentUser, users, shopName, items, categories, sales, saleItems,
      inventoryLogs, chatHistory, posFloats, posTransactions, posTransfers,
      posChargeTiers, restocks, restockItems, isLoading, error, digitalBalance,
      clearError, triggerAlert, login, register, logout, changePassword,
      addUser, syncUsers, updateUserAccount, deleteUserAccount, addItem,
      addSale, startPOSFloat, addPOSTransaction, addPOSTransfer, addCategory,
      addChatMessage, deleteItem, clearInventory, updateItem, deletePOSTransaction,
      returnSale, addItems, bulkUpdateItems, resetPOSTiersToDefault, clearPOSTiers,
      addPOSChargeTier, updatePOSChargeTier, deletePOSChargeTier, addRestock,
      processAdditiveRestockCSV
    }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
};
