import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, Bell, Search, ShoppingCart, User, LogOut, Package, AlertTriangle, ChevronRight, Settings, Banknote, ShieldCheck, Mail, Info, Key, Loader2, CheckCircle2 } from 'lucide-react';
import { useShop } from '../store';
import { UserRole } from '../types';
import ConfirmationModal from './ConfirmationModal';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
  const { isOfflineMode, currentUser, logout, changePassword, items, sales, shopName, digitalBalance, triggerAlert, globalSearchQuery, setGlobalSearchQuery } = useShop();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  
  // Search state & refs
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const notificationRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const lowStockItems = items.filter(i => i.quantityInStock <= i.reorderLevel);
  const lowStockCount = lowStockItems.length;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', roles: [UserRole.ADMIN, UserRole.SALESPERSON] },
    { id: 'sales-calculator', label: 'Sales Calc', roles: [UserRole.ADMIN, UserRole.SALESPERSON] },
    { id: 'pos-withdrawals', label: 'POS Withdraw', roles: [UserRole.ADMIN, UserRole.SALESPERSON] },
    { id: 'inventory', label: 'Inventory', roles: [UserRole.ADMIN, UserRole.SALESPERSON] },
    { id: 'sales-history', label: 'Sales History', roles: [UserRole.ADMIN, UserRole.SALESPERSON] },
    { id: 'restocks', label: 'Restocks', roles: [UserRole.ADMIN] },
    { id: 'reconciliation', label: 'Closing Accounts', roles: [UserRole.ADMIN] },
    { id: 'reports', label: 'Reports', roles: [UserRole.ADMIN] },
    { id: 'ai-assistant', label: 'AI Assistant', roles: [UserRole.ADMIN] },
    { id: 'users', label: 'Users', roles: [UserRole.ADMIN] },
  ];

  const pageTitle = menuItems.find(m => m.id === currentPage)?.label || 'Dashboard';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
    setIsMobileMenuOpen(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return triggerAlert("Validation Error", "Passwords do not match.", "warning");
    }
    if (newPassword.length < 6) {
      return triggerAlert("Validation Error", "Password must be at least 6 characters.", "warning");
    }

    setIsUpdatingPassword(true);
    try {
      await changePassword(newPassword);
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      triggerAlert("Update Failed", err.message || "Failed to update password.", "danger");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-3xl border-b border-slate-200 no-print">
      <div className="px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            className="lg:hidden p-2 text-slate-900 hover:bg-slate-100 rounded-none transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <h2 className="text-2xl font-semibold tracking-tight font-medium text-slate-900 hidden md:block tracking-tight">{pageTitle}</h2>
        </div>

        {/* Apple Spotlight Search Bar */}
        <div ref={searchContainerRef} className="flex-1 max-w-sm mx-6 hidden md:block relative">
          <div className="relative w-full group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-blue-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search products, orders, bills... (⌘K)"
              className="w-full bg-slate-100/80 border border-slate-200/60 hover:bg-slate-100/95 focus:bg-white focus:ring-4 focus:ring-blue-100/85 focus:border-blue-400 text-sm py-2 pl-10 pr-12 rounded-full transition-all text-slate-900 placeholder-slate-400 focus:outline-none"
              value={globalSearchQuery}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              onFocus={() => setIsSearchFocused(true)}
            />
            {globalSearchQuery && (
              <button
                onClick={() => {
                  setGlobalSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {!globalSearchQuery && (
              <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-slate-200 bg-white px-1.5 font-sans text-[10px] font-medium text-slate-400 shadow-sm">
                <span className="text-[10px]">⌘</span>K
              </kbd>
            )}
          </div>

          {/* Search Dropdown / Spotlight Overlay */}
          {isSearchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.06)] overflow-hidden animate-in fade-in slide-in-from-top-1.5 duration-100 z-50">
              <div className="p-3 max-h-[420px] overflow-y-auto custom-scrollbar">
                
                {/* 1. If query is empty: helpful suggestions */}
                {!globalSearchQuery.trim() ? (
                  <div className="space-y-4 p-2 text-left">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick Actions</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { onNavigate('inventory'); setIsSearchFocused(false); }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 text-left transition-colors"
                      >
                        <Package className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Browse Products</p>
                          <p className="text-[10px] text-slate-400">View & filter stock</p>
                        </div>
                      </button>
                      <button
                        onClick={() => { onNavigate('sales-history'); setIsSearchFocused(false); }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 text-left transition-colors"
                      >
                        <ShoppingCart className="w-4 h-4 text-emerald-500" />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Sales Ledger</p>
                          <p className="text-[10px] text-slate-400">Records & refunds</p>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  // 2. We have a search query, show custom categorized results
                  <div className="space-y-4">
                    {/* Products Category */}
                    <div className="text-left">
                      <div className="flex items-center justify-between px-2.5 pb-1.5 border-b border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Products</span>
                        <button 
                          onClick={() => { onNavigate('inventory'); setIsSearchFocused(false); }}
                          className="text-[10px] text-blue-500 hover:underline font-medium"
                        >
                          Show in Inventory →
                        </button>
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        {items.filter(item => 
                          item.name?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                          item.sku?.toLowerCase().includes(globalSearchQuery.toLowerCase())
                        ).slice(0, 3).map(item => (
                          <button
                            key={item.id}
                            onClick={() => {
                              onNavigate('inventory');
                              setIsSearchFocused(false);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-left transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Package className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
                              <div className="truncate">
                                <p className="text-xs font-medium text-slate-800 truncate">{item.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">SKU: {item.sku} • Stock: {item.quantityInStock} {item.unit}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-slate-800 shrink-0 bg-slate-100 px-2 py-0.5 rounded-full">
                              ₦{item.sellingPrice.toLocaleString()}
                            </span>
                          </button>
                        ))}
                        {items.filter(item => 
                          item.name?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                          item.sku?.toLowerCase().includes(globalSearchQuery.toLowerCase())
                        ).length === 0 && (
                          <p className="text-xs text-slate-400 py-2 px-2.5">No products found</p>
                        )}
                      </div>
                    </div>

                    {/* Sales & Orders Category */}
                    <div className="text-left">
                      <div className="flex items-center justify-between px-2.5 pb-1.5 border-b border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transactions</span>
                        <button 
                          onClick={() => { onNavigate('sales-history'); setIsSearchFocused(false); }}
                          className="text-[10px] text-emerald-500 hover:underline font-medium"
                        >
                          Show in Sales History →
                        </button>
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        {sales.filter(sale => 
                          sale.saleNumber?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                          sale.paymentMethod?.toLowerCase().includes(globalSearchQuery.toLowerCase())
                        ).slice(0, 3).map(sale => (
                          <button
                            key={sale.id}
                            onClick={() => {
                              onNavigate('sales-history');
                              setIsSearchFocused(false);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-left transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ShoppingCart className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 shrink-0" />
                              <div className="truncate">
                                <p className="text-xs font-medium text-slate-800 truncate">{sale.saleNumber}</p>
                                <p className="text-[10px] text-slate-400 truncate">{sale.paymentMethod.replace('_', ' ')} • {new Date(sale.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-emerald-600 shrink-0 bg-emerald-50 px-2 py-0.5 rounded-full">
                              ₦{sale.totalAmount.toLocaleString()}
                            </span>
                          </button>
                        ))}
                        {sales.filter(sale => 
                          sale.saleNumber?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                          sale.paymentMethod?.toLowerCase().includes(globalSearchQuery.toLowerCase())
                        ).length === 0 && (
                          <p className="text-xs text-slate-400 py-2 px-2.5">No transactions found</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {isOfflineMode && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-900 border-2 border-yellow-300 text-[10px] font-medium  tracking-normal animate-pulse">
              <span className="w-2 h-2 bg-yellow-500 rounded-none"></span>
              OFFLINE
            </div>
          )}
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className={`p-3 rounded-full transition-all relative ${isNotificationOpen ? 'bg-blue-600Light text-blue-500' : 'text-slate-600 hover:bg-slate-100'} btn-press`}
            >
              <Bell className="w-5 h-5" />
              {lowStockCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-medium flex items-center justify-center border-2 border-surface animate-pulse">
                  {lowStockCount}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">Notifications</h4>
                  <span className="text-[10px] font-black text-indigo-600  tracking-normal">{lowStockCount} Alerts</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {lowStockItems.length > 0 ? (
                    <div className="divide-y divide-slate-50">
                      {lowStockItems.map(item => (
                        <button 
                          key={item.id}
                          onClick={() => {
                            onNavigate('inventory');
                            setIsNotificationOpen(false);
                          }}
                          className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 group"
                        >
                          <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Stock level at {item.quantityInStock} {item.unit} (Limit: {item.reorderLevel})</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0 self-center" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400">
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No new notifications</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>
          
          <div className="relative" ref={accountRef}>
            <button 
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              className={`flex items-center gap-3 p-1 transition-all hover:bg-slate-50 btn-press ${isAccountMenuOpen ? 'bg-slate-100 ring-2 ring-accent' : ''}`}
            >
              <div className="hidden md:block text-right px-2">
                <p className="text-sm font-bold text-slate-900 leading-none font-sans">{currentUser?.fullName}</p>
                <p className="text-[10px] text-slate-500 font-medium tracking-normal  mt-1.5">{currentUser?.role}</p>
              </div>
              <div className="w-10 h-10 bg-blue-600 text-white flex items-center justify-center font-semibold tracking-tight text-lg font-bold">
                {currentUser?.fullName[0].toUpperCase()}
              </div>
            </button>

            {isAccountMenuOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-white border border-slate-200 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.08)] overflow-hidden">
                <div className="p-5 bg-slate-900 text-white border-b-2 border-slate-800">
                  <p className="text-[10px] font-medium text-slate-400  tracking-normal mb-1.5">Signed in as</p>
                  <p className="font-bold truncate font-sans text-sm">{currentUser?.email}</p>
                </div>
                <div className="p-2 space-y-1">
                  <button onClick={() => { setShowProfileModal(true); setIsAccountMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors">
                    <User className="w-4 h-4" />
                    Profile Info
                  </button>
                  <button onClick={() => { setShowSettingsModal(true); setIsAccountMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-3 text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors">
                    <Settings className="w-4 h-4" />
                    Account Settings
                  </button>
                  <div className="h-px bg-slate-200 my-2 mx-1"></div>
                  <button 
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full flex items-center gap-3 px-3 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout Session
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative w-4/5 max-sm bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
               <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0">
                  {shopName[0].toUpperCase()}
                </div>
                <span className="truncate">{shopName}</span>
              </h1>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {menuItems.filter(item => item.roles.includes(currentUser?.role || UserRole.SALESPERSON)).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    currentPage === item.id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3 px-2 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black">
                  {currentUser?.fullName[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{currentUser?.fullName}</p>
                  <p className="text-xs text-slate-500  font-bold tracking-tighter">{currentUser?.role}</p>
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-black  tracking-normal text-red-600 bg-red-50 hover:bg-red-100 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE INFO MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowProfileModal(false)}></div>
           <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
              <div className="bg-indigo-600 p-8 text-center text-white relative">
                 <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                 <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-black mx-auto mb-4 backdrop-blur-sm border border-white/20">{currentUser?.fullName[0].toUpperCase()}</div>
                 <h3 className="text-xl font-black">{currentUser?.fullName}</h3>
                 <p className="text-indigo-100 text-xs font-bold  tracking-normal mt-1 opacity-70">{currentUser?.role}</p>
              </div>
              <div className="p-8 space-y-4">
                 <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    <Mail className="w-5 h-5 text-indigo-600" />
                    <div>
                       <p className="text-[10px] font-black text-slate-400 ">Email Address</p>
                       <p className="font-bold text-slate-800">{currentUser?.email}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                       <p className="text-[10px] font-black text-slate-400 ">Access Level</p>
                       <p className="font-bold text-slate-800">{currentUser?.role.toUpperCase()}</p>
                    </div>
                 </div>
                 <button onClick={() => setShowProfileModal(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs  tracking-normal shadow-xl mt-4 transform active:scale-95 transition-all">Close Profile</button>
              </div>
           </div>
        </div>
      )}

      {/* ACCOUNT SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowSettingsModal(false)}></div>
           <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Account Security</h3>
                <button onClick={() => setShowSettingsModal(false)}><X className="w-6 h-6" /></button>
              </div>
              <div className="p-8 space-y-6">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                   <p className="text-[10px] font-black text-slate-400  tracking-normal mb-2 flex items-center gap-2">
                     <Key className="w-3 h-3" /> Change Credentials
                   </p>
                   <div>
                     <label className="block text-[9px] font-black text-slate-400  tracking-normal mb-1 ml-1">New Password</label>
                     <input 
                       type="password" required 
                       placeholder="••••••••"
                       className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                       value={newPassword}
                       onChange={(e) => setNewPassword(e.target.value)}
                     />
                   </div>
                   <div>
                     <label className="block text-[9px] font-black text-slate-400  tracking-normal mb-1 ml-1">Confirm New Password</label>
                     <input 
                       type="password" required 
                       placeholder="••••••••"
                       className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                       value={confirmPassword}
                       onChange={(e) => setConfirmPassword(e.target.value)}
                     />
                   </div>

                   {passwordSuccess && (
                     <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl flex items-center gap-2 text-[10px] font-bold  border border-emerald-100">
                       <CheckCircle2 className="w-4 h-4" /> Password Updated Successfully
                     </div>
                   )}

                   <button 
                     type="submit"
                     disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                     className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs  tracking-normal shadow-xl transform active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:shadow-none"
                   >
                     {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                     Update Security Key
                   </button>
                </form>

                <div className="h-px bg-slate-100 my-2"></div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                   <Info className="w-5 h-5 text-amber-600 shrink-0" />
                   <p className="text-[10px] text-amber-800 font-bold  tracking-normal leading-relaxed">For shop configuration changes or profile edits (email/name), contact the Super Admin or system provider.</p>
                </div>
              </div>
           </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Logout Session?"
        message="Are you sure you want to log out?"
        confirmLabel="Yes, Logout"
        variant="warning"
      />
    </header>
  );
};

export default Header;