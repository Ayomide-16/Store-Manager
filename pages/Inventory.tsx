import React, { useState, useRef, useMemo } from 'react';
import { useShop } from '../store';
import { UserRole, Item } from '../types';
import { formatCurrency, downloadData, parseFile, formatDate } from '../utils';
import { 
  Plus, Search, Edit2, Package, Upload, X, CheckCircle, 
  Download, Tag as TagIcon, Clock, FileDown, Layers, ChevronRight, Info,
  AlertTriangle, History, RefreshCw, Trash2, Loader2
} from 'lucide-react';
import FileActionMenu from '../components/FileActionMenu';

const Inventory: React.FC = () => {
  const { 
    currentUser, items, categories, shopName,
    addItem, addItems, updateItem, deleteItem, addCategory, clearInventory
  } = useShop();
  
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<Item | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Robust parser for currency strings containing symbols, commas, or spaces.
   */
  const parseNaira = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    // Strip everything except numbers and decimal point
    const cleaned = String(val).replace(/[^\d.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const filteredItems = useMemo(() => {
    const tokens = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return items.filter(item => {
      if (categoryFilter !== 'all' && item.categoryId !== categoryFilter) return false;
      if (tokens.length === 0) return true;
      const itemInfo = `${item.name} ${item.sku} ${item.categoryId}`.toLowerCase();
      return tokens.every(token => itemInfo.includes(token));
    });
  }, [items, searchTerm, categoryFilter]);

  const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    if (format === 'pdf') {
      window.print();
      return;
    }
    const data = filteredItems.map(i => ({
      Item: i.name,
      Category: categories.find(c => c.id === i.categoryId)?.name || 'General',
      'Selling Price (₦)': i.sellingPrice,
      'Cost Price (₦)': i.costPrice,
      'Profit (₦)': i.sellingPrice - i.costPrice,
      Quantity: i.quantityInStock
    }));
    const filename = `${shopName.replace(/\s+/g, '_')}_Inventory`;
    downloadData(data, filename, format);
  };

  const handleWipe = async () => {
    if (confirm("ARE YOU ABSOLUTELY SURE? This will delete ALL products in your shop database. This cannot be undone.")) {
      if (confirm("FINAL WARNING: Click OK to completely wipe your inventory.")) {
        try {
          await clearInventory();
          alert("Inventory wiped successfully.");
        } catch (err: any) {
          alert("Error clearing inventory: " + (err.message || "Unknown error"));
        }
      }
    }
  };

  const onFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedData = await parseFile(file);
      
      const normalizedData = (parsedData as any[])
        .filter((row: any) => {
          const name = row.Item || row.name || row.Product || row.item_name || row.Item_Name;
          return !!name;
        })
        .map((row: any) => {
          const categoryName = (row.Category || row.category || row.Category_Name || 'General').toString().trim();
          
          return {
            name: (row.Item || row.name || row.Product || row.item_name || row.Item_Name || '').toString().trim(),
            categoryName: categoryName,
            sellingPrice: parseNaira(row['Selling Price (₦)'] || row['Selling Price'] || row.sellingPrice || row.price || row.SellingPrice || row.Selling_Price || row.Selling_Price_N),
            costPrice: parseNaira(row['Cost Price (₦)'] || row['Cost Price'] || row.costPrice || row.cost || row.CostPrice || row.Cost_Price || row.Cost_Price_N),
            quantityInStock: parseNaira(row.Quantity || row.quantityInStock || row.Stock || row.qty || row.stock_quantity || row.Quantity_Bought || row.Quantity_Available)
          };
        });
      
      if (normalizedData.length === 0) {
        alert("No valid product data found. Please ensure your file has a column named 'Item' or 'Product'.");
        return;
      }
      
      setBulkPreview(normalizedData);
    } catch (err) {
      alert("Error parsing file. Please ensure it follows the correct format.");
      console.error(err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCommitImport = async () => {
    if (bulkPreview.length === 0 || isImporting) return;
    
    setIsImporting(true);
    try {
      // 1. Resolve Categories efficiently
      const uniqueCategoryNames = Array.from(new Set(bulkPreview.map(p => p.categoryName || 'General').filter(Boolean))) as string[];
      const categoryMap: Record<string, string> = {};
      
      for (const catName of uniqueCategoryNames) {
        const existing = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
        if (existing) {
          categoryMap[catName] = existing.id;
        } else if (!categoryMap[catName]) {
          const id = await addCategory(catName);
          if (id) categoryMap[catName] = id;
        }
      }

      // 2. Map items to strict schema
      const finalItems = bulkPreview.map(item => ({
        name: item.name,
        categoryId: categoryMap[item.categoryName || 'General'] || null,
        sellingPrice: item.sellingPrice,
        costPrice: item.costPrice,
        quantityInStock: item.quantityInStock,
        unit: 'pcs'
      }));

      // 3. Commit to store
      await addItems(finalItems);
      
      alert(`Successfully imported ${finalItems.length} products to inventory.`);
      setBulkPreview([]);
      setIsBulkModalOpen(false);
    } catch (err: any) {
      console.error("Critical Import Error:", err);
      // Robust error extraction to avoid [object Object]
      let errorMessage = "An unknown error occurred while saving.";
      if (err.message) errorMessage = err.message;
      else if (err.error_description) errorMessage = err.error_description;
      else if (err.details) errorMessage = err.details;
      else if (typeof err === 'string') errorMessage = err;
      else if (typeof err === 'object') errorMessage = JSON.stringify(err);
      
      alert("Critical Import Error:\n" + errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory</h1>
          <p className="text-slate-500 font-medium">Manage product listing and stock availability for {shopName}.</p>
        </div>
        <div className="flex flex-wrap gap-2 no-print items-center">
          <FileActionMenu 
            label="Export Data" 
            type="export" 
            onAction={handleExport} 
            showPdf 
          />
          {isAdmin && (
            <button onClick={handleWipe} className="px-4 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl font-bold hover:bg-rose-100 flex items-center gap-2 shadow-sm transition-all active:scale-95 text-xs">
              <Trash2 className="w-4 h-4" /> Wipe All
            </button>
          )}
          {isAdmin && (
            <FileActionMenu 
              label="Upload Stock" 
              type="import" 
              onAction={() => setIsBulkModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-xl shadow-indigo-600/20 transition-all active:scale-95 text-xs"
            />
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search product name or SKU..." 
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
            value={searchTerm} 
            onFocus={e => e.target.select()}
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <select className="px-4 py-3 bg-slate-50 border-transparent rounded-xl outline-none font-bold text-slate-600" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden print:border-0 print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-5">Product Name</th>
                <th className="px-8 py-5">Category</th>
                <th className="px-8 py-5">Stock Level</th>
                <th className="px-8 py-5">Selling Price</th>
                <th className="px-8 py-5 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => setSelectedDetailItem(item)}>
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{item.sku}</div>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium">{categories.find(c => c.id === item.categoryId)?.name || 'N/A'}</td>
                  <td className={`px-8 py-5 font-black ${item.quantityInStock <= item.reorderLevel ? 'text-rose-600' : 'text-slate-900'}`}>{item.quantityInStock} {item.unit}</td>
                  <td className="px-8 py-5 font-black text-slate-900">{formatCurrency(item.sellingPrice)}</td>
                  <td className="px-8 py-5 text-right no-print">
                    <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Info className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-400 font-black uppercase text-xs tracking-widest italic opacity-40">
                    <Package className="w-12 h-12 mx-auto mb-4" />
                    No items found. Choose "Upload Stock" to import your inventory.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isBulkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { if(!isImporting) { setIsBulkModalOpen(false); setBulkPreview([]); } }}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-black text-slate-900">Upload Inventory File</h3>
              <button disabled={isImporting} onClick={() => { setIsBulkModalOpen(false); setBulkPreview([]); }}><X className="w-6 h-6" /></button>
            </div>
            <div className="p-10 space-y-8">
              {!isImporting && (
                <div 
                  className="border-4 border-dashed border-slate-100 rounded-[2rem] p-12 text-center cursor-pointer hover:bg-slate-50 transition-all group"
                  onClick={onFileUploadClick}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.xlsx" className="hidden" />
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-black text-slate-900 mb-2">Click to Select CSV or Excel File</p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed theme-prose">
                    Headers: <strong>Item, Category, Selling Price (₦), Cost Price (₦), Quantity</strong>
                  </p>
                </div>
              )}

              {isImporting && (
                <div className="py-20 text-center space-y-6">
                  <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto" />
                  <div>
                    <p className="text-xl font-black text-slate-900 uppercase tracking-widest">Processing Data</p>
                    <p className="text-sm text-slate-500 font-medium">Syncing categories and saving products to database...</p>
                  </div>
                </div>
              )}

              {bulkPreview.length > 0 && !isImporting && (
                <div className="animate-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-black text-slate-900 uppercase text-[10px] tracking-widest">{bulkPreview.length} items parsed</p>
                    <button onClick={() => setBulkPreview([])} className="text-[10px] font-black text-rose-500 uppercase">Clear</button>
                  </div>
                  <div className="max-h-48 overflow-y-auto mb-6 border border-slate-100 rounded-xl p-2 bg-slate-50">
                    <table className="w-full text-[10px] font-bold text-slate-500">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left py-1">Item</th>
                          <th className="text-left py-1">Price</th>
                          <th className="text-right py-1">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreview.slice(0, 10).map((p, idx) => (
                          <tr key={idx}>
                            <td className="py-1 truncate max-w-[150px]">{p.name}</td>
                            <td className="py-1">{formatCurrency(p.sellingPrice || 0)}</td>
                            <td className="py-1 text-right">{p.quantityInStock}</td>
                          </tr>
                        ))}
                        {bulkPreview.length > 10 && (
                          <tr><td colSpan={3} className="pt-2 text-center opacity-50">...and {bulkPreview.length - 10} more items</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <button 
                    onClick={handleCommitImport} 
                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    Complete Import
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedDetailItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedDetailItem(null)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-indigo-600 p-8 text-white">
              <h3 className="text-3xl font-black tracking-tight">{selectedDetailItem.name}</h3>
              <p className="text-indigo-100 font-black uppercase text-[10px] tracking-widest mt-2">{selectedDetailItem.sku} • {categories.find(c => c.id === selectedDetailItem.categoryId)?.name}</p>
            </div>
            <div className="p-10 grid grid-cols-2 gap-8">
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Availability</p>
                  <p className="text-3xl font-black text-slate-900">{selectedDetailItem.quantityInStock} {selectedDetailItem.unit}</p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sale Price</p>
                  <p className="text-3xl font-black text-indigo-600">{formatCurrency(selectedDetailItem.sellingPrice)}</p>
               </div>
            </div>
            <div className="p-10 pt-0">
               <button onClick={() => setSelectedDetailItem(null)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transform active:scale-95 transition-all">Close Details</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;