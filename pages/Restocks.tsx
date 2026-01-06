
import React, { useState, useRef, useMemo } from 'react';
import { useShop } from '../store';
import { formatCurrency, formatDate, downloadData, parseFile } from '../utils';
import { 
  Plus, Truck, Search, History, ChevronRight, Trash2, Calendar, 
  User, Package, Upload, X, CheckCircle, Download, FileDown, Printer, Save, Loader2 
} from 'lucide-react';
import FileActionMenu from '../components/FileActionMenu';

const Restocks: React.FC = () => {
  const { items, categories, restocks, addRestock, processAdditiveRestockCSV, currentUser, shopName } = useShop();
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Restock State
  const [manualEntry, setManualEntry] = useState({
    itemId: '',
    quantity: 0,
    unitCost: 0,
    supplierName: 'General Supplier'
  });
  const [itemSearch, setItemSearch] = useState('');

  const filteredItemsForSelection = useMemo(() => {
    if (!itemSearch) return [];
    return items.filter(i => 
      i.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
      i.sku.toLowerCase().includes(itemSearch.toLowerCase())
    ).slice(0, 5);
  }, [items, itemSearch]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsedData = await parseFile(file);
      setBulkPreview(parsedData);
    } catch (err) {
      alert("Error parsing restock file.");
    }
  };

  const handleCommitBulkRestock = async () => {
    setIsProcessing(true);
    try {
      await processAdditiveRestockCSV(bulkPreview);
      setBulkPreview([]);
      setIsBulkModalOpen(false);
    } catch (err: any) {
      alert("Error processing restock: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEntry.itemId || manualEntry.quantity <= 0) return;
    setIsProcessing(true);
    try {
      await addRestock({
        supplierName: manualEntry.supplierName,
        items: [{
          id: manualEntry.itemId,
          quantity: manualEntry.quantity,
          unitCost: manualEntry.unitCost
        }]
      });
      setIsManualModalOpen(false);
      setManualEntry({ itemId: '', quantity: 0, unitCost: 0, supplierName: 'General Supplier' });
      setItemSearch('');
    } catch (err: any) {
      alert("Restock failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSheet = (format: 'csv' | 'xlsx' | 'pdf') => {
    if (format === 'pdf') {
      window.print();
      return;
    }
    const data = items.map(i => ({
      'Item': i.name,
      'Category': categories.find(c => c.id === i.categoryId)?.name || 'General',
      'Selling Price (₦)': i.sellingPrice,
      'Cost Price (₦)': i.costPrice,
      'Quantity Bought': '' 
    }));
    const filename = `${shopName.replace(/\s+/g, '_')}_Trip_Sheet`;
    downloadData(data, filename, format);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Restocks</h1>
          <p className="text-slate-500 font-medium">Record new inventory purchases for {shopName}.</p>
        </div>
        <div className="flex flex-wrap gap-2 no-print items-center">
          <FileActionMenu label="Trip Sheet" type="export" onAction={handleDownloadSheet} showPdf />
          <button 
            onClick={() => setIsManualModalOpen(true)}
            className="px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black shadow-xl transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Manual Entry
          </button>
          <FileActionMenu 
            label="Upload Restock" 
            type="import" 
            onAction={() => setIsBulkModalOpen(true)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden no-print">
        <div className="p-8 border-b border-slate-50 bg-slate-50/50">
           <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             <History className="w-6 h-6 text-indigo-500" />
             Recent Purchase Records
           </h3>
        </div>
        <div className="divide-y divide-slate-50">
          {restocks.map(restock => (
            <div key={restock.id} className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <Truck className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-black text-slate-900 text-lg leading-tight">{restock.supplierName}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> {formatDate(restock.restockDate)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-indigo-600">{formatCurrency(restock.totalAmount)}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Trip Value</p>
              </div>
            </div>
          ))}
          {restocks.length === 0 && (
            <div className="p-20 text-center text-slate-300 font-black uppercase text-xs tracking-widest italic opacity-50">
              No recent restock records.
            </div>
          )}
        </div>
      </div>

      {/* MANUAL RESTOCK MODAL */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsManualModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Manual Restock</h3>
              <button disabled={isProcessing} onClick={() => setIsManualModalOpen(false)}><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleManualSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Supplier / Trip Note</label>
                <input className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={manualEntry.supplierName} onChange={e => setManualEntry({...manualEntry, supplierName: e.target.value})} />
              </div>

              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Product</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    className="w-full pl-11 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" 
                    placeholder="Type name or SKU..."
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                  />
                </div>
                {filteredItemsForSelection.length > 0 && !manualEntry.itemId && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                    {filteredItemsForSelection.map(item => (
                      <button 
                        key={item.id} type="button" 
                        onClick={() => {
                          setManualEntry({...manualEntry, itemId: item.id, unitCost: item.costPrice});
                          setItemSearch(item.name);
                        }}
                        className="w-full p-4 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0"
                      >
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-black">Current Stock: {item.quantityInStock} {item.unit}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity Added</label>
                  <input type="number" required className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={manualEntry.quantity || ''} onFocus={e => e.target.select()} onChange={e => setManualEntry({...manualEntry, quantity: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Unit Cost (₦)</label>
                  <input type="number" required className="w-full px-5 py-3 bg-indigo-50 border border-indigo-200 rounded-xl font-bold text-indigo-700" value={manualEntry.unitCost || ''} onFocus={e => e.target.select()} onChange={e => setManualEntry({...manualEntry, unitCost: Number(e.target.value)})} />
                </div>
              </div>

              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Total Cost</p>
                  <p className="text-2xl font-black text-emerald-600">{formatCurrency(manualEntry.quantity * manualEntry.unitCost)}</p>
                </div>
                <button 
                  type="submit" 
                  disabled={isProcessing || !manualEntry.itemId}
                  className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-emerald-700 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK UPLOAD MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isProcessing && setIsBulkModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900">Bulk Restock Upload</h3>
              <button onClick={() => setIsBulkModalOpen(false)}><X className="w-6 h-6" /></button>
            </div>
            {!isProcessing && (
              <div className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-12 text-center cursor-pointer hover:bg-indigo-50 transition-all" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.xlsx" className="hidden" />
                <Upload className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                <p className="font-bold text-slate-700">Select Trip CSV/Excel</p>
              </div>
            )}
            {bulkPreview.length > 0 && !isProcessing && (
              <div className="mt-8 space-y-4">
                <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest">{bulkPreview.length} Items Detected</p>
                <button onClick={handleCommitBulkRestock} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl">Process Addition</button>
              </div>
            )}
            {isProcessing && (
              <div className="py-20 text-center space-y-4">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
                <p className="font-bold">Syncing stock levels...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Restocks;
