import React, { useState } from 'react';
import { LayoutDashboard, ShoppingCart, Package, History, Scale, Truck, MessageSquare, BarChart3, Users, LogOut, Banknote } from 'lucide-react';
import { UserRole } from '../types';
import { useShop } from '../store';
import ConfirmationModal from './ConfirmationModal';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { currentUser, logout, shopName } = useShop();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.SALESPERSON] },
    { id: 'sales-calculator', label: 'Sales Calc', icon: ShoppingCart, roles: [UserRole.ADMIN, UserRole.SALESPERSON] },
    { id: 'pos-withdrawals', label: 'POS Withdraw', icon: Banknote, roles: [UserRole.ADMIN, UserRole.SALESPERSON] },
    { id: 'inventory', label: 'Inventory', icon: Package, roles: [UserRole.ADMIN, UserRole.SALESPERSON] },
    { id: 'sales-history', label: 'History', icon: History, roles: [UserRole.ADMIN, UserRole.SALESPERSON] },
    { id: 'restocks', label: 'Restock', icon: Truck, roles: [UserRole.ADMIN] },
    { id: 'reconciliation', label: 'Closing Accounts', icon: Scale, roles: [UserRole.ADMIN] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: [UserRole.ADMIN] },
    { id: 'ai-assistant', label: 'AI Assistant', icon: MessageSquare, roles: [UserRole.ADMIN] },
    { id: 'users', label: 'Users', icon: Users, roles: [UserRole.ADMIN] },
  ];

  const handleLogout = async () => {
    await logout();
    setShowLogoutConfirm(false);
  };

  return (
    <div className="hidden lg:flex flex-col w-72 bg-white/80 backdrop-blur-xl text-slate-900 shrink-0 no-print border-r border-slate-200/60 z-40 relative">
      <div className="px-6 py-8">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
            {shopName[0]?.toUpperCase() || 'N'}
          </div>
          <span className="truncate">{shopName}</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.filter(item => item.roles.includes(currentUser?.role || UserRole.SALESPERSON)).map((item, i) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{ animationDelay: `${50 * i}ms` }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 stagger-1 ${
              currentPage === item.id 
                ? 'bg-blue-600/10 text-blue-600' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <item.icon className="w-5 h-5 opacity-90" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-200/60 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center font-semibold text-lg shadow-inner shrink-0">
            {currentUser?.fullName[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate leading-tight text-slate-900">{currentUser?.fullName}</p>
            <p className="text-xs text-slate-500 mt-0.5">{currentUser?.role}</p>
          </div>
        </div>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4" />
          Logout User
        </button>
      </div>

      <ConfirmationModal 
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Logout Session?"
        message="Are you sure you want to end your current session? You will need to sign in again to access the shop."
        confirmLabel="Yes, Logout"
        variant="warning"
      />
    </div>
  );
};

export default Sidebar;