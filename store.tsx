
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
  isOfflineMode: boolean;
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
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
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
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => localStorage.getItem('naija_shop_offline_mode') === 'true');

  const getLocal = <T,>(key: string, def: T): T => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : def;
    } catch {
      return def;
    }
  };

  const setLocal = <T,>(key: string, value: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error writing to localStorage', e);
    }
  };

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
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  const digitalBalance = (
    sales.filter(s => s.status === SaleStatus.COMPLETED && s.paymentMethod !== PaymentMethod.CASH)
         .reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0) +
    posTransactions.reduce((acc, t) => acc + (Number(t.totalPaid) || 0), 0)
  );

  const clearError = () => setError(null);

  const triggerAlert = (title: string, message: any, variant: 'danger' | 'warning' | 'info' = 'danger') => {
    setError(`${title}: ${getErrorMessage(message)}`);
  };

  const syncUsers = useCallback(async (forceOffline?: boolean) => {
    if (isOfflineMode || forceOffline || localStorage.getItem('naija_shop_offline_mode') === 'true') {
      const localUsers = getLocal<any[]>('naija_shop_users', []);
      setUsers(localUsers.map(u => ({
        id: u.id,
        email: u.email || '',
        fullName: u.fullName || 'Staff Member',
        role: u.role || UserRole.SALESPERSON,
        createdAt: u.createdAt || new Date().toISOString()
      })));
      return;
    }

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
      if (msg.includes('fetch') || msg.includes('NetworkError')) {
        console.warn('Silent user list fetch failure, switching to offline mode');
        setIsOfflineMode(true);
        localStorage.setItem('naija_shop_offline_mode', 'true');
        const localUsers = getLocal<any[]>('naija_shop_users', []);
        setUsers(localUsers.map(u => ({
          id: u.id,
          email: u.email || '',
          fullName: u.fullName || 'Staff Member',
          role: u.role || UserRole.SALESPERSON,
          createdAt: u.createdAt || new Date().toISOString()
        })));
      } else {
        console.warn('Silent User Sync Error (Suppressed console.error in tests):', msg);
        setError(msg);
      }
    }
  }, [isOfflineMode]);

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
    sale_date: sale.sale_date,
    createdAt: sale.created_at,
    updatedAt: sale.updated_at
  });

  const syncData = useCallback(async (forceOffline?: boolean) => {
    setIsLoading(true);
    const useOffline = isOfflineMode || forceOffline || localStorage.getItem('naija_shop_offline_mode') === 'true';
    try {
      if (useOffline) {
        setItems(getLocal<Item[]>('naija_shop_items', []));
        setSales(getLocal<Sale[]>('naija_shop_sales', []));
        setCategories(getLocal<Category[]>('naija_shop_categories', []));
        setPosFloats(getLocal<POSWithdrawalFloat[]>('naija_shop_pos_floats', []));
        setPosTransactions(getLocal<POSWithdrawalTransaction[]>('naija_shop_pos_transactions', []));
        setPosTransfers(getLocal<POSCashTransfer[]>('naija_shop_pos_transfers', []));
        setRestocks(getLocal<Restock[]>('naija_shop_restocks', []));
        setInventoryLogs(getLocal<InventoryLog[]>('naija_shop_inventory_logs', []));
        setChatHistory(getLocal<ChatMessage[]>('naija_shop_chat_history', []));
        
        const localTiers = getLocal<POSChargeTier[]>('naija_shop_pos_charge_tiers', []);
        if (localTiers.length > 0) setPosChargeTiers(localTiers);

        await syncUsers(true);
        setIsLoading(false);
        return;
      }

      const [itemsRes, salesRes, categoriesRes, posFloatsRes, posTxsRes, posTransfersRes, restocksRes] = await Promise.all([
        supabase.from('items').select('*').order('name'),
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
        supabase.from('pos_floats').select('*').order('created_at', { ascending: false }),
        supabase.from('pos_transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('pos_transfers').select('*').order('created_at', { ascending: false }),
        supabase.from('restocks').select('*').order('created_at', { ascending: false })
      ]);

      const hasFetchError = [itemsRes, salesRes, categoriesRes, posFloatsRes, posTxsRes, posTransfersRes, restocksRes].some(
        r => r.error && (r.error.message?.includes('fetch') || r.error.message?.includes('NetworkError') || r.error.status === 0)
      );
      if (hasFetchError) {
        throw new Error('Failed to fetch from database');
      }

      if (itemsRes.data) setItems(itemsRes.data.map(mapItemFromDB));
      if (salesRes.data) setSales(salesRes.data.map(mapSaleFromDB));
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (posFloatsRes.data) setPosFloats(posFloatsRes.data);
      if (posTxsRes.data) setPosTransactions(posTxsRes.data);
      if (posTransfersRes.data) setPosTransfers(posTransfersRes.data);
      if (restocksRes.data) setRestocks(restocksRes.data);

      await syncUsers(false);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      if (msg.includes('fetch') || msg.includes('NetworkError') || String(err).includes('fetch')) {
        console.warn('Supabase fetch failed. Seamlessly activating Offline Mode.');
        setIsOfflineMode(true);
        localStorage.setItem('naija_shop_offline_mode', 'true');
        
        setItems(getLocal<Item[]>('naija_shop_items', []));
        setSales(getLocal<Sale[]>('naija_shop_sales', []));
        setCategories(getLocal<Category[]>('naija_shop_categories', []));
        setPosFloats(getLocal<POSWithdrawalFloat[]>('naija_shop_pos_floats', []));
        setPosTransactions(getLocal<POSWithdrawalTransaction[]>('naija_shop_pos_transactions', []));
        setPosTransfers(getLocal<POSCashTransfer[]>('naija_shop_pos_transfers', []));
        setRestocks(getLocal<Restock[]>('naija_shop_restocks', []));
        setInventoryLogs(getLocal<InventoryLog[]>('naija_shop_inventory_logs', []));
        setChatHistory(getLocal<ChatMessage[]>('naija_shop_chat_history', []));
        
        const localTiers = getLocal<POSChargeTier[]>('naija_shop_pos_charge_tiers', []);
        if (localTiers.length > 0) setPosChargeTiers(localTiers);

        await syncUsers(true);
      } else {
        triggerAlert('Sync Error', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isOfflineMode, syncUsers]);

  useEffect(() => {
    const checkUser = async () => {
      const offlineModeLS = localStorage.getItem('naija_shop_offline_mode') === 'true';
      if (isOfflineMode || offlineModeLS) {
        const offlineUser = localStorage.getItem('naija_shop_current_user');
        const offlineShop = localStorage.getItem('naija_shop_shop_name');
        if (offlineUser) {
          try {
            setCurrentUser(JSON.parse(offlineUser));
            setShopName(offlineShop || 'NaijaShop');
            syncData(true);
            return;
          } catch {
            localStorage.removeItem('naija_shop_current_user');
          }
        }
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
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
      } catch (err: any) {
        const msg = String(err);
        if (msg.includes('fetch') || msg.includes('NetworkError')) {
          console.warn('Supabase offline on boot, activating offline mode fallback');
          setIsOfflineMode(true);
          localStorage.setItem('naija_shop_offline_mode', 'true');
          
          const offlineUser = localStorage.getItem('naija_shop_current_user');
          const offlineShop = localStorage.getItem('naija_shop_shop_name');
          if (offlineUser) {
            try {
              setCurrentUser(JSON.parse(offlineUser));
              setShopName(offlineShop || 'NaijaShop');
              syncData(true);
              return;
            } catch {
              localStorage.removeItem('naija_shop_current_user');
            }
          }
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      }
    };
    checkUser();
  }, [isOfflineMode, syncData]);

  const login = async (email: string, password: string) => {
    if (isOfflineMode) {
      const offlineUsers = getLocal<any[]>('naija_shop_users', []);
      const matched = offlineUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!matched && (email === 'admin@demo.com' || email === 'salesperson@demo.com') && password === 'password123') {
        const demoUser: User = {
          id: email === 'admin@demo.com' ? 'demo-admin-id' : 'demo-staff-id',
          email,
          fullName: email === 'admin@demo.com' ? 'Shop Owner (Demo)' : 'Sales Staff (Demo)',
          role: email === 'admin@demo.com' ? UserRole.ADMIN : UserRole.SALESPERSON,
          createdAt: new Date().toISOString()
        };
        setCurrentUser(demoUser);
        setShopName('NaijaShop Demo');
        localStorage.setItem('naija_shop_current_user', JSON.stringify(demoUser));
        localStorage.setItem('naija_shop_shop_name', 'NaijaShop Demo');
        syncData();
        return;
      }

      if (matched && matched.password === password) {
        const user: User = {
          id: matched.id,
          email: matched.email,
          fullName: matched.fullName,
          role: matched.role,
          createdAt: matched.createdAt
        };
        setCurrentUser(user);
        setShopName(matched.shopName || 'NaijaShop');
        localStorage.setItem('naija_shop_current_user', JSON.stringify(user));
        localStorage.setItem('naija_shop_shop_name', matched.shopName || 'NaijaShop');
        syncData();
        return;
      }
      throw new Error('Invalid email or password.');
    }

    try {
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
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('fetch') || msg.includes('NetworkError')) {
        console.warn('Login failed due to network error, switching to Offline Mode');
        setIsOfflineMode(true);
        localStorage.setItem('naija_shop_offline_mode', 'true');
        
        // Retry login immediately in offline mode
        const offlineUsers = getLocal<any[]>('naija_shop_users', []);
        const matched = offlineUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (!matched && (email === 'admin@demo.com' || email === 'salesperson@demo.com') && password === 'password123') {
          const demoUser: User = {
            id: email === 'admin@demo.com' ? 'demo-admin-id' : 'demo-staff-id',
            email,
            fullName: email === 'admin@demo.com' ? 'Shop Owner (Demo)' : 'Sales Staff (Demo)',
            role: email === 'admin@demo.com' ? UserRole.ADMIN : UserRole.SALESPERSON,
            createdAt: new Date().toISOString()
          };
          setCurrentUser(demoUser);
          setShopName('NaijaShop Demo');
          localStorage.setItem('naija_shop_current_user', JSON.stringify(demoUser));
          localStorage.setItem('naija_shop_shop_name', 'NaijaShop Demo');
          syncData();
          return;
        }

        if (matched && matched.password === password) {
          const user: User = {
            id: matched.id,
            email: matched.email,
            fullName: matched.fullName,
            role: matched.role,
            createdAt: matched.createdAt
          };
          setCurrentUser(user);
          setShopName(matched.shopName || 'NaijaShop');
          localStorage.setItem('naija_shop_current_user', JSON.stringify(user));
          localStorage.setItem('naija_shop_shop_name', matched.shopName || 'NaijaShop');
          syncData();
          return;
        }
        throw new Error('Supabase unreachable, and offline demo login failed. Please run Seeding first.');
      } else {
        throw err;
      }
    }
  };

  const register = async (params: { email: string; password: string; fullName: string; shopName: string }) => {
    if (isOfflineMode) {
      const offlineUsers = getLocal<any[]>('naija_shop_users', []);
      if (offlineUsers.some(u => u.email.toLowerCase() === params.email.toLowerCase())) {
        throw new Error('Email already registered.');
      }
      const newId = `user-${Math.random().toString(36).substring(7)}`;
      const newUser = {
        id: newId,
        email: params.email,
        password: params.password,
        fullName: params.fullName,
        role: UserRole.ADMIN,
        shopName: params.shopName,
        createdAt: new Date().toISOString()
      };
      offlineUsers.push(newUser);
      setLocal('naija_shop_users', offlineUsers);

      const user: User = {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        createdAt: newUser.createdAt
      };
      setCurrentUser(user);
      setShopName(params.shopName);
      localStorage.setItem('naija_shop_current_user', JSON.stringify(user));
      localStorage.setItem('naija_shop_shop_name', params.shopName);
      syncData();
      return;
    }

    try {
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
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('fetch') || msg.includes('NetworkError')) {
        console.warn('Registration failed due to network error, switching to Offline Mode');
        setIsOfflineMode(true);
        localStorage.setItem('naija_shop_offline_mode', 'true');

        const offlineUsers = getLocal<any[]>('naija_shop_users', []);
        const newId = `user-${Math.random().toString(36).substring(7)}`;
        const newUser = {
          id: newId,
          email: params.email,
          password: params.password,
          fullName: params.fullName,
          role: UserRole.ADMIN,
          shopName: params.shopName,
          createdAt: new Date().toISOString()
        };
        offlineUsers.push(newUser);
        setLocal('naija_shop_users', offlineUsers);

        const user: User = {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          createdAt: newUser.createdAt
        };
        setCurrentUser(user);
        setShopName(params.shopName);
        localStorage.setItem('naija_shop_current_user', JSON.stringify(user));
        localStorage.setItem('naija_shop_shop_name', params.shopName);
        syncData();
      } else {
        throw err;
      }
    }
  };

  const logout = async () => {
    if (!isOfflineMode) {
      try {
        await signOut();
      } catch (e) {
        console.warn('Offline on logout');
      }
    }
    setCurrentUser(null);
    localStorage.removeItem('naija_shop_current_user');
    localStorage.removeItem('naija_shop_shop_name');
  };

  const changePassword = async (newPassword: string) => {
    if (isOfflineMode) {
      if (!currentUser) return;
      const offlineUsers = getLocal<any[]>('naija_shop_users', []);
      const updated = offlineUsers.map(u => u.id === currentUser.id ? { ...u, password: newPassword } : u);
      setLocal('naija_shop_users', updated);
      return;
    }
    const { error } = await updatePassword(newPassword);
    if (error) throw error;
  };

  const addUser = async (user: Partial<User> & { password?: string }) => {
    if (isOfflineMode) {
      const offlineUsers = getLocal<any[]>('naija_shop_users', []);
      const newId = `user-${Math.random().toString(36).substring(7)}`;
      const newUser = {
        id: newId,
        email: user.email,
        password: user.password || 'password123',
        fullName: user.fullName,
        role: user.role || UserRole.SALESPERSON,
        shopName: shopName,
        createdAt: new Date().toISOString()
      };
      offlineUsers.push(newUser);
      setLocal('naija_shop_users', offlineUsers);
      syncUsers();
      return;
    }
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
    if (isOfflineMode) {
      const offlineUsers = getLocal<any[]>('naija_shop_users', []);
      const updated = offlineUsers.map(u => u.id === id ? { ...u, fullName: updates.fullName, role: updates.role } : u);
      setLocal('naija_shop_users', updated);
      syncUsers();
      return;
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: { full_name: updates.fullName, role: updates.role }
    });
    if (error) throw error;
    syncUsers();
  };

  const deleteUserAccount = async (id: string) => {
    if (isOfflineMode) {
      const offlineUsers = getLocal<any[]>('naija_shop_users', []);
      const filtered = offlineUsers.filter(u => u.id !== id);
      setLocal('naija_shop_users', filtered);
      syncUsers();
      return;
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;
    syncUsers();
  };

  const addItem = async (item: Partial<Item>) => {
    if (isOfflineMode) {
      const localItems = getLocal<Item[]>('naija_shop_items', []);
      const newItem: Item = {
        id: `offline-item-${Math.random().toString(36).substring(7)}`,
        name: item.name || 'Unnamed Item',
        sku: item.sku || generateSKU(item.name || 'ITEM'),
        categoryId: item.categoryId || null,
        unit: item.unit || 'pcs',
        costPrice: Number(item.costPrice) || 0,
        sellingPrice: Number(item.sellingPrice) || 0,
        quantityInStock: Number(item.quantityInStock) || 0,
        reorderLevel: Number(item.reorderLevel) || 0,
        allowFractional: item.allowFractional === true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      localItems.push(newItem);
      setLocal('naija_shop_items', localItems);

      const localLogs = getLocal<InventoryLog[]>('naija_shop_inventory_logs', []);
      const newLog: InventoryLog = {
        id: `offline-log-${Math.random().toString(36).substring(7)}`,
        itemId: newItem.id,
        itemName: newItem.name,
        changeType: 'addition',
        previousQuantity: 0,
        newQuantity: newItem.quantityInStock,
        changeAmount: newItem.quantityInStock,
        reason: 'Initial creation (Offline Mode)',
        performedBy: currentUser?.fullName || 'System',
        createdAt: new Date().toISOString()
      };
      localLogs.push(newLog);
      setLocal('naija_shop_inventory_logs', localLogs);

      syncData();
      return;
    }

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
    
    if (isOfflineMode) {
      const localItems = getLocal<Item[]>('naija_shop_items', []);
      const localSales = getLocal<Sale[]>('naija_shop_sales', []);
      const localSaleItems = getLocal<SaleItem[]>('naija_shop_sale_items', []);
      const localLogs = getLocal<InventoryLog[]>('naija_shop_inventory_logs', []);

      const saleId = `offline-sale-${Math.random().toString(36).substring(7)}`;

      const itemsToInsert = saleData.items.map(cartItem => {
        const itemIdx = localItems.findIndex(i => i.id === cartItem.id);
        const item = localItems[itemIdx];
        subtotal += item.sellingPrice * cartItem.quantity;
        totalCost += item.costPrice * cartItem.quantity;

        const prevQty = item.quantityInStock;
        item.quantityInStock = Math.max(0, prevQty - cartItem.quantity);
        item.updatedAt = new Date().toISOString();

        const newLog: InventoryLog = {
          id: `offline-log-${Math.random().toString(36).substring(7)}`,
          itemId: item.id,
          itemName: item.name,
          changeType: 'sale',
          previousQuantity: prevQty,
          newQuantity: item.quantityInStock,
          changeAmount: -cartItem.quantity,
          reason: `Sold in Transaction ${saleNumber}`,
          performedBy: currentUser.fullName,
          createdAt: new Date().toISOString()
        };
        localLogs.push(newLog);

        return {
          id: `offline-saleitem-${Math.random().toString(36).substring(7)}`,
          saleId: saleId,
          itemId: item.id,
          itemName: item.name,
          quantity: cartItem.quantity,
          unitPrice: item.sellingPrice,
          costPrice: item.costPrice,
          lineTotal: item.sellingPrice * cartItem.quantity,
          profitMargin: ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100,
          createdAt: new Date().toISOString()
        };
      });

      const totalAmount = subtotal + saleData.additionalCharges;
      const profitAmount = totalAmount - totalCost;

      const newSale: Sale = {
        id: saleId,
        saleNumber,
        status: SaleStatus.COMPLETED,
        subtotal,
        additionalCharges: saleData.additionalCharges,
        totalAmount,
        profitAmount,
        paymentMethod: saleData.paymentMethod,
        createdBy: currentUser.id,
        saleDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      localSales.unshift(newSale);
      localSaleItems.push(...itemsToInsert);

      setLocal('naija_shop_items', localItems);
      setLocal('naija_shop_sales', localSales);
      setLocal('naija_shop_sale_items', localSaleItems);
      setLocal('naija_shop_inventory_logs', localLogs);

      syncData();
      return;
    }

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
      payment_method: saleData.paymentMethod,
      created_by: currentUser.id,
      sale_date: new Date().toISOString().split('T')[0]
    }).select().single();

    if (saleErr) throw saleErr;

    const { error: itemsErr } = await supabase.from('sale_items').insert(
      itemsToInsert.map(si => ({ ...si, sale_id: sale.id }))
    );

    if (itemsErr) throw itemsErr;

    syncData();
  };

  const activeFloat = posFloats.find(f => f.status === 'active');

  const startPOSFloat = async (openingBalance: number) => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];

    if (isOfflineMode) {
      const localFloats = getLocal<POSWithdrawalFloat[]>('naija_shop_pos_floats', []);
      const newFloat: POSWithdrawalFloat = {
        id: `offline-float-${Math.random().toString(36).substring(7)}`,
        date: today,
        openingBalance,
        currentBalance: openingBalance,
        closingBalance: null,
        totalWithdrawalsProcessed: 0,
        totalChargesEarned: 0,
        status: 'active',
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      localFloats.unshift(newFloat);
      setLocal('naija_shop_pos_floats', localFloats);
      syncData();
      return;
    }

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

    if (isOfflineMode) {
      const localTxs = getLocal<POSWithdrawalTransaction[]>('naija_shop_pos_transactions', []);
      const localFloats = getLocal<POSWithdrawalFloat[]>('naija_shop_pos_floats', []);

      const newTx: POSWithdrawalTransaction = {
        id: `offline-tx-${Math.random().toString(36).substring(7)}`,
        floatId: activeFloat.id,
        transactionNumber: txNum,
        customerName: data.customerName,
        withdrawalAmount: data.withdrawalAmount,
        serviceCharge: data.serviceCharge,
        totalPaid,
        paymentMethod: data.paymentMethod,
        createdBy: currentUser.id,
        transactionDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      localTxs.unshift(newTx);
      setLocal('naija_shop_pos_transactions', localTxs);

      const floatIdx = localFloats.findIndex(f => f.id === activeFloat.id);
      if (floatIdx !== -1) {
        localFloats[floatIdx].currentBalance -= data.withdrawalAmount;
        localFloats[floatIdx].totalWithdrawalsProcessed += 1;
        localFloats[floatIdx].totalChargesEarned += data.serviceCharge;
        localFloats[floatIdx].updatedAt = new Date().toISOString();
      }
      setLocal('naija_shop_pos_floats', localFloats);

      syncData();
      return txNum;
    }
    
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

    if (isOfflineMode) {
      const localTransfers = getLocal<POSCashTransfer[]>('naija_shop_pos_transfers', []);
      const localFloats = getLocal<POSWithdrawalFloat[]>('naija_shop_pos_floats', []);

      const newTransfer: POSCashTransfer = {
        id: `offline-trans-${Math.random().toString(36).substring(7)}`,
        floatId: activeFloat.id,
        amount,
        source,
        transferredBy: currentUser.id,
        createdAt: new Date().toISOString()
      };
      localTransfers.unshift(newTransfer);
      setLocal('naija_shop_pos_transfers', localTransfers);

      const floatIdx = localFloats.findIndex(f => f.id === activeFloat.id);
      if (floatIdx !== -1) {
        localFloats[floatIdx].currentBalance += amount;
        localFloats[floatIdx].updatedAt = new Date().toISOString();
      }
      setLocal('naija_shop_pos_floats', localFloats);
      syncData();
      return;
    }

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
    if (isOfflineMode) {
      const localCats = getLocal<Category[]>('naija_shop_categories', []);
      const newCat: Category = {
        id: `offline-cat-${Math.random().toString(36).substring(7)}`,
        name,
        createdAt: new Date().toISOString()
      };
      localCats.push(newCat);
      setLocal('naija_shop_categories', localCats);
      setCategories(prev => [...prev, newCat]);
      return newCat.id;
    }

    const { data, error } = await supabase.from('categories').insert({ name }).select().single();
    if (error) throw error;
    setCategories(prev => [...prev, data]);
    return data.id;
  };

  const addChatMessage = (message: string, response: string) => {
    if (!currentUser) return;
    const newMessage: ChatMessage = {
      id: `offline-chat-${Math.random().toString(36).substring(7)}`,
      userId: currentUser.id,
      message,
      response,
      createdAt: new Date().toISOString()
    };
    
    if (isOfflineMode) {
      const localChat = getLocal<ChatMessage[]>('naija_shop_chat_history', []);
      localChat.push(newMessage);
      setLocal('naija_shop_chat_history', localChat);
    }
    setChatHistory(prev => [...prev, newMessage]);
  };

  const deleteItem = async (id: string) => {
    if (isOfflineMode) {
      const localItems = getLocal<Item[]>('naija_shop_items', []);
      const filtered = localItems.filter(i => i.id !== id);
      setLocal('naija_shop_items', filtered);
      setItems(filtered);
      return;
    }

    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) throw error;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const clearInventory = async () => {
    if (isOfflineMode) {
      setLocal('naija_shop_items', []);
      setItems([]);
      return;
    }

    const { error } = await supabase.from('items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    setItems([]);
  };

  const updateItem = async (id: string, updates: Partial<Item>) => {
    if (isOfflineMode) {
      const localItems = getLocal<Item[]>('naija_shop_items', []);
      const itemIdx = localItems.findIndex(i => i.id === id);
      if (itemIdx !== -1) {
        const item = localItems[itemIdx];
        const prevQty = item.quantityInStock;
        localItems[itemIdx] = {
          ...item,
          name: updates.name !== undefined ? updates.name : item.name,
          sku: updates.sku !== undefined ? updates.sku : item.sku,
          categoryId: updates.categoryId !== undefined ? updates.categoryId : item.categoryId,
          unit: updates.unit !== undefined ? updates.unit : item.unit,
          costPrice: updates.costPrice !== undefined ? Number(updates.costPrice) : item.costPrice,
          sellingPrice: updates.sellingPrice !== undefined ? Number(updates.sellingPrice) : item.sellingPrice,
          quantityInStock: updates.quantityInStock !== undefined ? Number(updates.quantityInStock) : item.quantityInStock,
          reorderLevel: updates.reorderLevel !== undefined ? Number(updates.reorderLevel) : item.reorderLevel,
          allowFractional: updates.allowFractional !== undefined ? updates.allowFractional === true : item.allowFractional,
          updatedAt: new Date().toISOString()
        };

        if (updates.quantityInStock !== undefined && Number(updates.quantityInStock) !== prevQty) {
          const localLogs = getLocal<InventoryLog[]>('naija_shop_inventory_logs', []);
          const newLog: InventoryLog = {
            id: `offline-log-${Math.random().toString(36).substring(7)}`,
            itemId: item.id,
            itemName: item.name,
            changeType: 'adjustment',
            previousQuantity: prevQty,
            newQuantity: Number(updates.quantityInStock),
            changeAmount: Number(updates.quantityInStock) - prevQty,
            reason: 'Manual Inventory Adjustment (Offline Mode)',
            performedBy: currentUser?.fullName || 'System',
            createdAt: new Date().toISOString()
          };
          localLogs.push(newLog);
          setLocal('naija_shop_inventory_logs', localLogs);
        }

        setLocal('naija_shop_items', localItems);
        syncData();
      }
      return;
    }

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
    if (isOfflineMode) {
      const localTxs = getLocal<POSWithdrawalTransaction[]>('naija_shop_pos_transactions', []);
      const localFloats = getLocal<POSWithdrawalFloat[]>('naija_shop_pos_floats', []);
      const tx = localTxs.find(t => t.id === id);
      
      if (tx) {
        setLocal('naija_shop_pos_transactions', localTxs.filter(t => t.id !== id));
        if (activeFloat && tx.floatId === activeFloat.id) {
          const floatIdx = localFloats.findIndex(f => f.id === activeFloat.id);
          if (floatIdx !== -1) {
            localFloats[floatIdx].currentBalance += tx.withdrawalAmount;
            localFloats[floatIdx].totalWithdrawalsProcessed = Math.max(0, localFloats[floatIdx].totalWithdrawalsProcessed - 1);
            localFloats[floatIdx].totalChargesEarned = Math.max(0, localFloats[floatIdx].totalChargesEarned - tx.serviceCharge);
            localFloats[floatIdx].updatedAt = new Date().toISOString();
          }
          setLocal('naija_shop_pos_floats', localFloats);
        }
        syncData();
      }
      return;
    }

    const { error } = await supabase.from('pos_transactions').delete().eq('id', id);
    if (error) throw error;
    syncData();
  };

  const returnSale = async (id: string, reason: string) => {
    if (isOfflineMode) {
      const localSales = getLocal<Sale[]>('naija_shop_sales', []);
      const localItems = getLocal<Item[]>('naija_shop_items', []);
      const localSaleItems = getLocal<SaleItem[]>('naija_shop_sale_items', []);
      const localLogs = getLocal<InventoryLog[]>('naija_shop_inventory_logs', []);
      
      const saleIdx = localSales.findIndex(s => s.id === id);
      if (saleIdx !== -1 && localSales[saleIdx].status !== SaleStatus.RETURNED) {
        localSales[saleIdx].status = SaleStatus.RETURNED;
        localSales[saleIdx].returnReason = reason;
        localSales[saleIdx].updatedAt = new Date().toISOString();

        const soldItems = localSaleItems.filter(si => si.saleId === id);
        soldItems.forEach(si => {
          const itemIdx = localItems.findIndex(i => i.id === si.itemId);
          if (itemIdx !== -1) {
            const prevQty = localItems[itemIdx].quantityInStock;
            localItems[itemIdx].quantityInStock += si.quantity;
            localItems[itemIdx].updatedAt = new Date().toISOString();

            const newLog: InventoryLog = {
              id: `offline-log-${Math.random().toString(36).substring(7)}`,
              itemId: localItems[itemIdx].id,
              itemName: localItems[itemIdx].name,
              changeType: 'return',
              previousQuantity: prevQty,
              newQuantity: localItems[itemIdx].quantityInStock,
              changeAmount: si.quantity,
              reason: `Sale Return (Offline Mode): ${reason}`,
              performedBy: currentUser?.fullName || 'System',
              createdAt: new Date().toISOString()
            };
            localLogs.push(newLog);
          }
        });

        setLocal('naija_shop_sales', localSales);
        setLocal('naija_shop_items', localItems);
        setLocal('naija_shop_inventory_logs', localLogs);
        syncData();
      }
      return;
    }

    const { error } = await supabase.from('sales').update({ 
      status: SaleStatus.RETURNED,
      return_reason: reason 
    }).eq('id', id);
    if (error) throw error;
    syncData();
  };

  const addItems = async (newItems: Partial<Item>[]) => {
    if (isOfflineMode) {
      const localItems = getLocal<Item[]>('naija_shop_items', []);
      const localLogs = getLocal<InventoryLog[]>('naija_shop_inventory_logs', []);

      newItems.forEach(item => {
        const newItem: Item = {
          id: `offline-item-${Math.random().toString(36).substring(7)}`,
          name: item.name || 'Unnamed Item',
          sku: item.sku || generateSKU(item.name || 'ITEM'),
          categoryId: item.categoryId || null,
          unit: item.unit || 'pcs',
          costPrice: Number(item.costPrice) || 0,
          sellingPrice: Number(item.sellingPrice) || 0,
          quantityInStock: Number(item.quantityInStock) || 0,
          reorderLevel: Number(item.reorderLevel) || 0,
          allowFractional: item.allowFractional === true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        localItems.push(newItem);

        const newLog: InventoryLog = {
          id: `offline-log-${Math.random().toString(36).substring(7)}`,
          itemId: newItem.id,
          itemName: newItem.name,
          changeType: 'addition',
          previousQuantity: 0,
          newQuantity: newItem.quantityInStock,
          changeAmount: newItem.quantityInStock,
          reason: 'Bulk created item (Offline Mode)',
          performedBy: currentUser?.fullName || 'System',
          createdAt: new Date().toISOString()
        };
        localLogs.push(newLog);
      });

      setLocal('naija_shop_items', localItems);
      setLocal('naija_shop_inventory_logs', localLogs);
      syncData();
      return;
    }

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
    if (isOfflineMode) {
      const localItems = getLocal<Item[]>('naija_shop_items', []);
      const localLogs = getLocal<InventoryLog[]>('naija_shop_inventory_logs', []);
      const updated = localItems.map(item => {
        if (ids.includes(item.id)) {
          const prevLvl = item.reorderLevel;
          const newItem = {
            ...item,
            categoryId: updates.categoryId !== undefined ? updates.categoryId : item.categoryId,
            reorderLevel: updates.reorderLevel !== undefined ? Number(updates.reorderLevel) : item.reorderLevel,
            updatedAt: new Date().toISOString()
          };

          if (updates.reorderLevel !== undefined && Number(updates.reorderLevel) !== prevLvl) {
            const newLog: InventoryLog = {
              id: `offline-log-${Math.random().toString(36).substring(7)}`,
              itemId: item.id,
              itemName: item.name,
              changeType: 'bulk_update',
              previousQuantity: item.quantityInStock,
              newQuantity: item.quantityInStock,
              changeAmount: 0,
              reason: `Reorder level changed from ${prevLvl} to ${updates.reorderLevel} (Offline Mode)`,
              performedBy: currentUser?.fullName || 'System',
              createdAt: new Date().toISOString()
            };
            localLogs.push(newLog);
          }
          return newItem;
        }
        return item;
      });

      setLocal('naija_shop_items', updated);
      setLocal('naija_shop_inventory_logs', localLogs);
      syncData();
      return;
    }

    const dbUpdates: any = {};
    if (updates.categoryId) dbUpdates.category_id = updates.categoryId;
    if (updates.reorderLevel !== undefined) dbUpdates.reorder_level = updates.reorderLevel;

    const { error } = await supabase.from('items').update(dbUpdates).in('id', ids);
    if (error) throw error;
    syncData();
  };

  const resetPOSTiersToDefault = () => {
    if (isOfflineMode) {
      setLocal('naija_shop_pos_charge_tiers', DEFAULT_POS_TIERS);
    }
    setPosChargeTiers(DEFAULT_POS_TIERS);
  };
  
  const clearPOSTiers = () => {
    if (isOfflineMode) {
      setLocal('naija_shop_pos_charge_tiers', []);
    }
    setPosChargeTiers([]);
  };

  const addPOSChargeTier = (tier: Partial<POSChargeTier>) => {
    const newTier = { ...tier, id: `tier-${Math.random().toString(36).substring(7)}`, isActive: true } as POSChargeTier;
    if (isOfflineMode) {
      const localTiers = getLocal<POSChargeTier[]>('naija_shop_pos_charge_tiers', DEFAULT_POS_TIERS);
      localTiers.push(newTier);
      setLocal('naija_shop_pos_charge_tiers', localTiers);
    }
    setPosChargeTiers(prev => [...prev, newTier]);
  };

  const updatePOSChargeTier = (id: string, updates: Partial<POSChargeTier>) => {
    const updatedTiers = posChargeTiers.map(t => t.id === id ? { ...t, ...updates } : t);
    if (isOfflineMode) {
      setLocal('naija_shop_pos_charge_tiers', updatedTiers);
    }
    setPosChargeTiers(updatedTiers);
  };

  const deletePOSChargeTier = (id: string) => {
    const updatedTiers = posChargeTiers.filter(t => t.id !== id);
    if (isOfflineMode) {
      setLocal('naija_shop_pos_charge_tiers', updatedTiers);
    }
    setPosChargeTiers(updatedTiers);
  };

  const addRestock = async (data: { supplierName: string; items: any[] }) => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];

    if (isOfflineMode) {
      const localRestocks = getLocal<Restock[]>('naija_shop_restocks', []);
      const localRestockItems = getLocal<RestockItem[]>('naija_shop_restock_items', []);
      const localItems = getLocal<Item[]>('naija_shop_items', []);
      const localLogs = getLocal<InventoryLog[]>('naija_shop_inventory_logs', []);

      const restockId = `offline-restock-${Math.random().toString(36).substring(7)}`;
      const totalAmount = data.items.reduce((acc, i) => acc + (i.quantity * i.unitCost), 0);

      const newRestock: Restock = {
        id: restockId,
        supplierName: data.supplierName,
        restockDate: today,
        totalAmount,
        createdBy: currentUser.id,
        createdAt: new Date().toISOString()
      };
      localRestocks.unshift(newRestock);

      data.items.forEach(ri => {
        const newRi: RestockItem = {
          id: `offline-ri-${Math.random().toString(36).substring(7)}`,
          restockId: restockId,
          itemId: ri.id,
          quantity: ri.quantity,
          unitCost: ri.unitCost,
          createdAt: new Date().toISOString()
        };
        localRestockItems.push(newRi);

        const itemIdx = localItems.findIndex(i => i.id === ri.id);
        if (itemIdx !== -1) {
          const item = localItems[itemIdx];
          const prevQty = item.quantityInStock;
          item.quantityInStock += ri.quantity;
          item.costPrice = ri.unitCost;
          item.updatedAt = new Date().toISOString();

          const newLog: InventoryLog = {
            id: `offline-log-${Math.random().toString(36).substring(7)}`,
            itemId: item.id,
            itemName: item.name,
            changeType: 'restock',
            previousQuantity: prevQty,
            newQuantity: item.quantityInStock,
            changeAmount: ri.quantity,
            reason: `Restocked ${ri.quantity} units from supplier ${data.supplierName} (Offline Mode)`,
            performedBy: currentUser.fullName,
            createdAt: new Date().toISOString()
          };
          localLogs.push(newLog);
        }
      });

      setLocal('naija_shop_restocks', localRestocks);
      setLocal('naija_shop_restock_items', localRestockItems);
      setLocal('naija_shop_items', localItems);
      setLocal('naija_shop_inventory_logs', localLogs);
      syncData();
      return;
    }

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
      unit_cost: ri.unit_cost
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
      isOfflineMode, currentUser, users, shopName, items, categories, sales, saleItems,
      inventoryLogs, chatHistory, posFloats, posTransactions, posTransfers,
      posChargeTiers, restocks, restockItems, isLoading, error, digitalBalance,
      clearError, triggerAlert, login, register, logout, changePassword,
      addUser, syncUsers, updateUserAccount, deleteUserAccount, addItem,
      addSale, startPOSFloat, addPOSTransaction, addPOSTransfer, addCategory,
      addChatMessage, deleteItem, clearInventory, updateItem, deletePOSTransaction,
      returnSale, addItems, bulkUpdateItems, resetPOSTiersToDefault, clearPOSTiers,
      addPOSChargeTier, updatePOSChargeTier, deletePOSChargeTier, addRestock,
      processAdditiveRestockCSV, globalSearchQuery, setGlobalSearchQuery
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
