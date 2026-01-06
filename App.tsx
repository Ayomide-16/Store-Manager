
import React, { useState } from 'react';
import { ShopProvider, useShop } from './store';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SalesCalculator from './pages/SalesCalculator';
import Inventory from './pages/Inventory';
import SalesHistory from './pages/SalesHistory';
import Reconciliation from './pages/Reconciliation';
import Restocks from './pages/Restocks';
import AIAssistant from './pages/AIAssistant';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import POSWithdrawals from './pages/POSWithdrawals';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const AppContent: React.FC = () => {
  const { currentUser } = useShop();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!currentUser) return <Login />;

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'sales-calculator': return <SalesCalculator />;
      case 'inventory': return <Inventory />;
      case 'sales-history': return <SalesHistory />;
      case 'reconciliation': return <Reconciliation />;
      case 'restocks': return <Restocks />;
      case 'ai-assistant': return <AIAssistant />;
      case 'reports': return <Reports />;
      case 'users': return <UserManagement />;
      case 'pos-withdrawals': return <POSWithdrawals />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <ShopProvider>
    <AppContent />
  </ShopProvider>
);

export default App;
