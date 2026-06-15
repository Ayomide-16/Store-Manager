
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight font-medium text-slate-900 tracking-tight ">Restocks</h1>
          <p className="text-slate-500 font-medium text-sm  tracking-normal mt-2">Record new inventory purchases for {shopName}.</p>
        </div>
        <div className="flex flex-wrap gap-4 no-print items-center">
          <FileActionMenu label="Trip Sheet" type="export" onAction={handleDownloadSheet} showPdf />
          <button 
            onClick={() => setIsManualModalOpen(true)}
            className="px-6 py-4 bg-slate-900 border border-slate-200 rounded-2xl text-white font-medium font-bold text-xs  tracking-normal hover:-translate-y-0.5 hover:shadow-sm shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all flex items-center gap-3"
          >
            <Plus className="w-5 h-5" /> Manual Entry
          </button>
          <FileActionMenu 
            label="Upload Restock" 
            type="import" 
            onAction={() => setIsBulkModalOpen(true)}
            className="px-6 py-4 bg-blue-600 border border-slate-200 rounded-2xl text-white font-medium font-bold text-xs  tracking-normal hover:-translate-y-0.5 hover:shadow-sm shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all flex items-center gap-3"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden no-print">
        <div className="p-8 border-b border-slate-100 bg-white/60 backdrop-blur-3xl flex justify-between items-center">
           <h3 className="text-2xl font-semibold tracking-tight font-medium text-slate-900 tracking-tight flex items-center gap-4 ">
             <History className="w-8 h-8 text-blue-500" />
             Recent Purchase Records
           </h3>
        </div>
        <div className="divide-y-4 divide-ink">
          {restocks.map(restock => (
            <div key={restock.id} className="p-8 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 border border-slate-200 rounded-2xl text-white flex items-center justify-center shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                  <Truck className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-medium font-bold text-slate-900 text-xl ">{restock.supplierName}</p>
                  <p className="text-[10px] font-medium font-bold text-slate-500  tracking-normal mt-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> {formatDate(restock.restockDate)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold tracking-tight font-medium text-slate-900">{formatCurrency(restock.totalAmount)}</p>
                <p className="text-[10px] font-medium font-bold text-slate-400  tracking-normal mt-2">Total Trip Value</p>
              </div>
            </div>
          ))}
          {restocks.length === 0 && (
            <div className="p-24 text-center text-slate-300 font-medium font-bold  text-xs tracking-normal">
              No recent restock records.
            </div>
          )}
        </div>
      </div>

      {/* MANUAL RESTOCK MODAL */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setIsManualModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white/60 backdrop-blur-3xl">
              <h3 className="text-2xl font-semibold tracking-tight font-medium text-slate-900 tracking-tight ">Manual Restock</h3>
              <button disabled={isProcessing} className="hover:rotate-90 transition-transform text-slate-900" onClick={() => setIsManualModalOpen(false)}><X className="w-8 h-8" /></button>
            </div>
            <form onSubmit={handleManualSubmit} className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-medium font-bold text-slate-500  tracking-normal">Supplier / Trip Note</label>
                <input className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:bg-slate-50 font-medium font-bold text-slate-900" value={manualEntry.supplierName} onChange={e => setManualEntry({...manualEntry, supplierName: e.target.value})} />
              </div>

              <div className="space-y-3 relative">
                <label className="text-[10px] font-medium font-bold text-slate-500  tracking-normal">Search Product</label>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:bg-slate-50 font-medium font-bold text-slate-900" 
                    placeholder="Type name or SKU..."
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                  />
                </div>
                {filteredItemsForSelection.length > 0 && !manualEntry.itemId && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_2px_10px_rgb(0,0,0,0.02)] z-20 overflow-hidden">
                    {filteredItemsForSelection.map(item => (
                      <button 
                        key={item.id} type="button" 
                        onClick={() => {
                          setManualEntry({...manualEntry, itemId: item.id, unitCost: item.costPrice});
                          setItemSearch(item.name);
                        }}
                        className="w-full p-5 text-left hover:bg-slate-50 border-b-2 border-slate-200 last:border-0"
                      >
                        <p className="font-medium font-bold text-slate-900 ">{item.name}</p>
                        <p className="text-[10px] text-slate-500  font-medium font-bold mt-2">Current Stock: {item.quantityInStock} {item.unit}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-medium font-bold text-slate-500  tracking-normal">Quantity Added</label>
                  <input type="number" required className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:bg-slate-50 font-medium font-bold text-slate-900 text-center text-xl" value={manualEntry.quantity || ''} onFocus={e => e.target.select()} onChange={e => setManualEntry({...manualEntry, quantity: Number(e.target.value)})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-medium font-bold text-slate-500  tracking-normal">New Unit Cost (₦)</label>
                  <input type="number" required className="w-full px-6 py-4 bg-white/60 backdrop-blur-3xl border border-slate-200 rounded-2xl outline-none focus:bg-white font-medium font-bold text-blue-500 text-center text-xl" value={manualEntry.unitCost || ''} onFocus={e => e.target.select()} onChange={e => setManualEntry({...manualEntry, unitCost: Number(e.target.value)})} />
                </div>
              </div>

              <div className="p-8 bg-white border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-2">Total Cost</p>
                  <p className="text-3xl font-semibold tracking-tight font-medium text-slate-900">{formatCurrency(manualEntry.quantity * manualEntry.unitCost)}</p>
                </div>
                <button 
                  type="submit" 
                  disabled={isProcessing || !manualEntry.itemId}
                  className="px-8 py-5 bg-[#10b981] border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 text-slate-900 font-medium font-bold  text-xs tracking-normal shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] disabled:opacity-50 disabled:bg-slate-200 transition-all"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Restock'}
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
          <div className="relative bg-white w-full max-w-2xl border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in zoom-in duration-200 p-12">
            <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-6">
              <h3 className="text-3xl font-semibold tracking-tight font-medium text-slate-900 ">Bulk Restock Upload</h3>
              <button className="hover:rotate-90 transition-transform text-slate-900" onClick={() => setIsBulkModalOpen(false)}><X className="w-8 h-8" /></button>
            </div>
            {!isProcessing && (
              <div className="border-4 border-dashed border-slate-200 p-16 text-center cursor-pointer hover:bg-white/60 backdrop-blur-3xl transition-all bg-white" onClick={() => fileInputRef.current?.click()}>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.xlsx" className="hidden" />
                <Upload className="w-16 h-16 text-blue-500 mx-auto mb-6" />
                <p className="font-medium font-bold text-slate-900  tracking-normal">Select Trip CSV/Excel</p>
              </div>
            )}
            {bulkPreview.length > 0 && !isProcessing && (
              <div className="mt-10 space-y-6">
                <p className="font-medium font-bold text-sm text-slate-500  tracking-normal">{bulkPreview.length} Items Detected</p>
                <button onClick={handleCommitBulkRestock} className="w-full py-6 bg-blue-600 border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 text-white font-medium font-bold text-sm  tracking-normal shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-sm transition-all">Process Addition</button>
              </div>
            )}
            {isProcessing && (
              <div className="py-24 text-center space-y-6">
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto" />
                <p className="font-medium font-bold text-slate-900  tracking-normal">Syncing stock levels...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Restocks;
