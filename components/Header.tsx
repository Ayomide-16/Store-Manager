import React, { useState, useRef, useEffect } from 'react';
import { Menu, X, Bell, Search, ShoppingCart, User, LogOut, Package, AlertTriangle, ChevronRight, Settings, Banknote } from 'lucide-react';
import { useShop } from '../store';
import { UserRole } from '../types';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
  const { currentUser, logout, items, shopName } = useShop();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  
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
    { id: 'reconciliation', label: 'Reconciliation', roles: [UserRole.ADMIN] },
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 no-print">
      <div className="px-4 h-16 flex items-center justify-between">
        <button 
          className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800 hidden md:block">{pageTitle}</h2>
          <div className="relative hidden lg:flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Quick search..." 
              className="pl-9 pr-4 py-2 bg-slate-100 border-transparent rounded-full text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white w-64 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className={`p-2 rounded-full transition-all relative ${isNotificationOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Bell className="w-5 h-5" />
              {lowStockCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {lowStockCount}
                </span>
              )}
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">Notifications</h4>
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{lowStockCount} Alerts</span>
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
              className={`flex items-center gap-2 p-1 rounded-full transition-all hover:bg-slate-50 ${isAccountMenuOpen ? 'bg-slate-100 ring-2 ring-indigo-500/20' : ''}`}
            >
              <div className="hidden md:block text-right px-2">
                <p className="text-sm font-semibold text-slate-900 leading-none">{currentUser?.fullName}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">{currentUser?.role}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/20">
                {currentUser?.fullName[0].toUpperCase()}
              </div>
            </button>

            {isAccountMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 bg-indigo-600 text-white">
                  <p className="text-xs font-medium opacity-80">Signed in as</p>
                  <p className="font-bold truncate">{currentUser?.email}</p>
                </div>
                <div className="p-2">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                    <User className="w-4 h-4" />
                    Profile Info
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                    <Settings className="w-4 h-4" />
                    Account Settings
                  </button>
                  <div className="h-px bg-slate-100 my-2 mx-1"></div>
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
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
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-tighter">{currentUser?.role}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
