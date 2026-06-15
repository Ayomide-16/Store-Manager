
import React, { useState, useMemo, useEffect } from 'react';
import { useShop } from '../store';
import { SaleStatus, PaymentMethod, UserRole, Sale } from '../types';
import { formatCurrency, formatDateTime, downloadData } from '../utils';
import { Search, Eye, RotateCcw, Download, History, X, RefreshCw, Calendar, HelpCircle, User, FileDown } from 'lucide-react';
import FileActionMenu from '../components/FileActionMenu';

const SalesHistory: React.FC = () => {
  const { sales, currentUser, saleItems, returnSale, shopName, globalSearchQuery, setGlobalSearchQuery } = useShop();
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const [searchTerm, setSearchTerm] = useState(globalSearchQuery);

  useEffect(() => {
    setSearchTerm(globalSearchQuery);
  }, [globalSearchQuery]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setGlobalSearchQuery(val);
  };
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight font-medium text-slate-900 tracking-tight ">Sales Ledger</h1>
          <p className="text-slate-500 font-medium text-sm  tracking-normal mt-2">{isAdmin ? `Complete records for ${shopName}` : 'Your recent recorded sales'}</p>
        </div>
        <div className="flex flex-wrap gap-4 no-print items-center">
          {isFiltered && (
            <button 
              onClick={resetFilters}
              className="flex items-center gap-3 px-5 py-3 bg-red-600 border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] text-white font-medium font-bold  transition-all text-xs"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Filters
            </button>
          )}
          <FileActionMenu 
            label="Export Records" 
            type="export" 
            onAction={handleExport} 
            showPdf 
          />
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-3xl p-6 border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col md:flex-row gap-4 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-905 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search transaction number, salesperson or items..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium font-bold text-slate-900 focus:ring-0 outline-none transition-all focus:bg-slate-50" 
            value={searchTerm} 
            onChange={(e) => handleSearchChange(e.target.value)} 
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden print:border-0 print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-white font-medium font-bold  tracking-normal text-xs border-b-4 border-black">
              <tr>
                <th className="px-6 py-5 border-r border-slate-800">Date & Number</th>
                <th className="px-6 py-5 border-r border-slate-800">Status</th>
                <th className="px-6 py-5 border-r border-slate-800">Method</th>
                <th className="px-6 py-5 border-r border-slate-800">Amount</th>
                {isAdmin && (
                  <th className="px-6 py-5 border-r border-slate-800">Profit</th>
                )}
                <th className="px-6 py-5 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-ink bg-white">
              {filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-5 border-r-2 border-slate-200">
                    <div className="font-medium font-bold text-slate-900  text-base">{sale.saleNumber}</div>
                    <div className="text-[10px] text-slate-500 font-medium  tracking-normal mt-1">{formatDateTime(sale.createdAt)}</div>
                  </td>
                  <td className="px-6 py-5 border-r-2 border-slate-200">
                    <span className={`px-3 py-1 border-2 font-medium font-bold text-[10px]  shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${
                      sale.status === SaleStatus.COMPLETED ? 'bg-[#10b981] border-slate-200 text-slate-900' : 
                      sale.status === SaleStatus.RETURNED ? 'bg-red-500 border-slate-200 text-white' : 
                      'bg-slate-200 border-slate-200 text-slate-600'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 border-r-2 border-slate-200">
                    <span className={`px-3 py-1 border-2 font-medium font-bold text-[10px]  shadow-[0_2px_10px_rgb(0,0,0,0.02)] ${
                      sale.paymentMethod === PaymentMethod.CASH ? 'bg-yellow-400 border-slate-200 text-slate-900' : 
                      sale.paymentMethod === PaymentMethod.BANK_TRANSFER ? 'bg-cyan-400 border-slate-200 text-slate-900' : 
                      'bg-blue-600 border-slate-200 text-white'
                    }`}>
                      {sale.paymentMethod.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-5 border-r-2 border-slate-200 font-semibold tracking-tight font-medium text-xl text-slate-900">{formatCurrency(sale.totalAmount)}</td>
                  {isAdmin && (
                    <td className="px-6 py-5 border-r-2 border-slate-200 text-[#10b981] font-semibold tracking-tight font-medium text-xl shadow-inner bg-slate-900 !text-lime-400">{formatCurrency(sale.profitAmount)}</td>
                  )}
                  <td className="px-6 py-5 text-right no-print">
                    <button 
                      onClick={() => setSelectedSale(sale)}
                      className="p-3 border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-sm text-slate-900 bg-white/60 backdrop-blur-3xl transition-all inline-flex"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-24 text-center text-slate-400 font-medium font-bold  text-xs tracking-normal bg-slate-50 border-t-2 border-slate-200">
                    <History className="w-16 h-16 mx-auto mb-6 text-slate-300" />
                    No transactions found in ledger.
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
