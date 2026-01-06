
import React, { useState, useMemo } from 'react';
import { useShop } from '../store';
import { SaleStatus, PaymentMethod, UserRole, Sale } from '../types';
import { formatCurrency, formatDateTime, downloadData } from '../utils';
import { Search, Eye, RotateCcw, Download, History, X, RefreshCw, Calendar, HelpCircle, User, FileDown } from 'lucide-react';
import FileActionMenu from '../components/FileActionMenu';

const SalesHistory: React.FC = () => {
  const { sales, currentUser, saleItems, returnSale, shopName } = useShop();
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<SaleStatus | 'all'>('all');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | 'all'>('all');
  const [selectedSalesperson, setSelectedSalesperson] = useState<string | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [saleToReturn, setSaleToReturn] = useState<string | null>(null);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedMethod('all');
    setSelectedSalesperson('all');
    setStartDate('');
    setEndDate('');
  };

  const isFiltered = searchTerm !== '' || 
                     selectedStatus !== 'all' || 
                     selectedMethod !== 'all' || 
                     selectedSalesperson !== 'all' || 
                     startDate !== '' || 
                     endDate !== '';

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesUserScope = isAdmin || sale.createdBy === currentUser?.id;
      
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSaleNumber = sale.saleNumber.toLowerCase().includes(lowerSearch);
      
      const itemsInThisSale = saleItems.filter(si => si.saleId === sale.id);
      const matchesItemName = itemsInThisSale.some(si => si.itemName.toLowerCase().includes(lowerSearch));
      
      const matchesSearch = matchesSaleNumber || matchesItemName;

      const matchesStatus = selectedStatus === 'all' || sale.status === selectedStatus;
      const matchesMethod = selectedMethod === 'all' || sale.paymentMethod === selectedMethod;
      const matchesSalesperson = selectedSalesperson === 'all' || sale.createdBy === selectedSalesperson;

      const saleDateTs = new Date(sale.createdAt).getTime();
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;
      
      let matchesDate = true;
      if (start && saleDateTs < start) matchesDate = false;
      if (end && saleDateTs > end) matchesDate = false;

      return matchesUserScope && matchesSearch && matchesStatus && matchesMethod && matchesSalesperson && matchesDate;
    });
  }, [sales, isAdmin, currentUser, searchTerm, selectedStatus, selectedMethod, selectedSalesperson, startDate, endDate, saleItems]);

  const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    if (format === 'pdf') {
      window.print();
      return;
    }
    const exportData = filteredSales.map(sale => {
      const itemsPurchased = saleItems
        .filter(si => si.saleId === sale.id)
        .map(si => `${si.itemName} (${si.quantity})`)
        .join('; ');
      
      return {
        'Sale Number': sale.saleNumber,
        'Date': formatDateTime(sale.createdAt),
        'Status': sale.status,
        'Payment Method': sale.paymentMethod,
        'Items': itemsPurchased,
        'Subtotal': sale.subtotal,
        'Additional Charges': sale.additionalCharges,
        'Total Amount': sale.totalAmount,
        'Profit': sale.profitAmount,
        'Salesperson ID': sale.createdBy,
        'Return Reason': sale.returnReason || ''
      };
    });
    const filename = `${shopName.replace(/\s+/g, '_')}_Sales_History`;
    downloadData(exportData, filename, format);
  };

  const getStatusBadge = (status: SaleStatus) => {
    switch (status) {
      case SaleStatus.COMPLETED: return 'bg-emerald-100 text-emerald-700';
      case SaleStatus.RETURNED: return 'bg-rose-100 text-rose-700';
      case SaleStatus.CANCELED: return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getMethodBadge = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CASH: return 'bg-amber-100 text-amber-700';
      case PaymentMethod.BANK_TRANSFER: return 'bg-blue-100 text-blue-700';
      case PaymentMethod.CARD: return 'bg-indigo-100 text-indigo-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales History</h1>
          <p className="text-slate-500">{isAdmin ? `Full transaction ledger for ${shopName}.` : 'Your recent recorded sales.'}</p>
        </div>
        <div className="flex flex-wrap gap-2 no-print items-center">
          {isFiltered && (
            <button 
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 text-xs"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Filters
            </button>
          )}
          <FileActionMenu 
            label="Export Sales" 
            type="export" 
            onAction={handleExport} 
            showPdf 
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print:border-0 print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Date & Number</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Amount</th>
                {isAdmin && (
                  <th className="px-6 py-4">Profit</th>
                )}
                <th className="px-6 py-4 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{sale.saleNumber}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{formatDateTime(sale.createdAt)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${getStatusBadge(sale.status)}`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${getMethodBadge(sale.paymentMethod)}`}>
                      {sale.paymentMethod.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-black text-slate-900">{formatCurrency(sale.totalAmount)}</td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-emerald-600 font-black">{formatCurrency(sale.profitAmount)}</td>
                  )}
                  <td className="px-6 py-4 text-right no-print">
                    <button 
                      onClick={() => setSelectedSale(sale)}
                      className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-20 text-center text-slate-400 font-black uppercase text-xs tracking-widest italic opacity-40">
                    <History className="w-12 h-12 mx-auto mb-4" />
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesHistory;
