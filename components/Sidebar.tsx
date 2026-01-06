import React from 'react';
import { LayoutDashboard, ShoppingCart, Package, History, Scale, Truck, MessageSquare, BarChart3, Users, LogOut, Banknote } from 'lucide-react';
import { UserRole } from '../types';
import { useShop } from '../store';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { currentUser, logout, shopName } = useShop();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.SALESPERSON] },
    { id: 'sales-calculator', label: 'Sales Calc', icon: ShoppingCart, roles: [UserRole.ADMIN, UserRole.SALESPERSON] },
    { id: 'pos-withdrawals', label: 'POS Withdraw', icon: Banknote, roles: [UserRole.ADMIN, UserRole.SALESPERSON] },
    { id: 'inventory', label: 'Inventory', icon: Package, roles: [UserRole.ADMIN, UserRole.SALESPERSON] },
    { id: 'sales-history', label: 'History', icon: History, roles: [UserRole.ADMIN, UserRole.SALESPERSON] },
    { id: 'restocks', label: 'Restock', icon: Truck, roles: [UserRole.ADMIN] },
    { id: 'reconciliation', label: 'Reconciliation', icon: Scale, roles: [UserRole.ADMIN] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: [UserRole.ADMIN] },
    { id: 'ai-assistant', label: 'AI Assistant', icon: MessageSquare, roles: [UserRole.ADMIN] },
    { id: 'users', label: 'Users', icon: Users, roles: [UserRole.ADMIN] },
  ];

  return (
    <div className="hidden lg:flex flex-col w-64 bg-slate-900 text-white shrink-0 no-print border-r border-white/5">
      <div className="p-8">
        <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-[1rem] flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
            {shopName[0]?.toUpperCase() || 'N'}
          </div>
          <span className="truncate">{shopName}</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.filter(item => item.roles.includes(currentUser?.role || UserRole.SALESPERSON)).map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              currentPage === item.id 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 translate-x-1' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <item.icon className={`w-5 h-5 ${currentPage === item.id ? 'text-white' : 'text-slate-500'}`} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 mt-auto border-t border-white/5 bg-slate-950/50">
        <div className="flex items-center gap-4 mb-6 px-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center font-black text-indigo-400 border border-white/5 shadow-inner">
            {currentUser?.fullName[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-black truncate leading-tight">{currentUser?.fullName}</p>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter mt-1">{currentUser?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/30 transition-all active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          Logout Session
        </button>
      </div>
    </div>
  );
};

export default Sidebar;