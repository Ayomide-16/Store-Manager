import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useShop } from '../store';
import { UserRole, Item } from '../types';
import { formatCurrency, downloadData, parseFile, formatDate, generateSKU } from '../utils';
import { 
  Plus, Search, Edit2, Package, Upload, X, CheckCircle, 
  Download, Tag as TagIcon, Clock, FileDown, Layers, ChevronRight, Info,
  AlertTriangle, History, RefreshCw, Trash2, Loader2, Save, Scissors
} from 'lucide-react';
import FileActionMenu from '../components/FileActionMenu';
import ConfirmationModal from '../components/ConfirmationModal';

const Inventory: React.FC = () => {
  const { 
    currentUser, items, categories, shopName,
    addItem, addItems, updateItem, deleteItem, addCategory, clearInventory,
    globalSearchQuery, setGlobalSearchQuery
  } = useShop();
  
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  
  const [searchTerm, setSearchTerm] = useState(globalSearchQuery);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low_stock'>('all');
  const [isConfiguringLevels, setIsConfiguringLevels] = useState(false);

  useEffect(() => {
    setSearchTerm(globalSearchQuery);
  }, [globalSearchQuery]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setGlobalSearchQuery(val);
  };
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<Item | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom Confirmation States
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  const [newItem, setNewItem] = useState({
    id: '',
    name: '',
    categoryId: '',
    newCategoryName: '',
    sellingPrice: 0,
    costPrice: 0,
    quantityInStock: 0,
    reorderLevel: 5,
    unit: 'pcs',
    allowFractional: false
  });

  const lowStockItems = useMemo(() => {
    return items.filter(item => item.quantityInStock <= item.reorderLevel);
  }, [items]);

  const handleUpdateThreshold = async (item: Item, newLvl: number) => {
    try {
      await updateItem(item.id, {
        name: item.name,
        categoryId: item.categoryId || '',
        sellingPrice: item.sellingPrice,
        costPrice: item.costPrice,
        quantityInStock: item.quantityInStock,
        reorderLevel: newLvl,
        unit: item.unit,
        allowFractional: item.allowFractional === true
      });
    } catch (err: any) {
      console.error("Error setting threshold:", err);
    }
  };

  const filteredItems = useMemo(() => {
    const tokens = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return items.filter(item => {
      if (categoryFilter !== 'all' && item.categoryId !== categoryFilter) return false;
      if (stockFilter === 'low_stock' && item.quantityInStock > item.reorderLevel) return false;
      if (tokens.length === 0) return true;
      const itemInfo = `${item.name} ${item.sku} ${item.categoryId}`.toLowerCase();
      return tokens.every(token => itemInfo.includes(token));
    });
  }, [items, searchTerm, categoryFilter, stockFilter]);

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
      Quantity: i.quantityInStock,
      'Fractional Selling': i.allowFractional ? 'Yes' : 'No'
    }));
    const filename = `${shopName.replace(/\s+/g, '_')}_Inventory`;
    downloadData(data, filename, format);
  };

  const handleWipe = async () => {
    setIsImporting(true);
    try {
      await clearInventory();
      setShowWipeConfirm(false);
    } catch (err: any) {
      alert("Error clearing inventory: " + (err.message || JSON.stringify(err)));
    } finally {
      setIsImporting(false);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setNewItem({ id: '', name: '', categoryId: '', newCategoryName: '', sellingPrice: 0, costPrice: 0, quantityInStock: 0, reorderLevel: 5, unit: 'pcs', allowFractional: false });
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setIsEditMode(true);
    setNewItem({
      id: item.id,
      name: item.name,
      categoryId: item.categoryId || '',
      newCategoryName: '',
      sellingPrice: item.sellingPrice,
      costPrice: item.costPrice,
      quantityInStock: item.quantityInStock,
      reorderLevel: item.reorderLevel,
      unit: item.unit,
      allowFractional: item.allowFractional === true
    });
    setIsAddModalOpen(true);
    setSelectedDetailItem(null);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isImporting) return;
    
    setIsImporting(true);
    try {
      let finalCategoryId = newItem.categoryId;
      if (newItem.categoryId === 'new' && newItem.newCategoryName) {
        finalCategoryId = await addCategory(newItem.newCategoryName);
      } else if (!finalCategoryId) {
        finalCategoryId = await addCategory('General');
      }

      const itemPayload = {
        name: newItem.name,
        categoryId: finalCategoryId,
        sellingPrice: Number(newItem.sellingPrice),
        costPrice: Number(newItem.costPrice),
        quantityInStock: Number(newItem.quantityInStock),
        reorderLevel: Number(newItem.reorderLevel),
        unit: newItem.unit,
        allowFractional: newItem.allowFractional === true
      };

      if (isEditMode && newItem.id) {
        await updateItem(newItem.id, itemPayload);
      } else {
        await addItem(itemPayload);
      }
      
      setIsAddModalOpen(false);
    } catch (err: any) {
      alert("Error saving item: " + (err.message || JSON.stringify(err)));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight font-medium text-slate-900 tracking-tight">Inventory</h1>
          <p className="text-slate-500 font-medium text-xs  tracking-normal mt-1">Manage product listing for {shopName}.</p>
        </div>
        <div className="flex flex-wrap gap-3 no-print items-center">
          <FileActionMenu label="Export Data" type="export" onAction={handleExport} showPdf />
          {isAdmin && (
            <>
              <button 
                onClick={() => setShowWipeConfirm(true)} 
                className="px-6 py-3 bg-red-50 text-red-600 border-2 border-red-200 font-medium font-bold text-xs  tracking-normal flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> Wipe
              </button>
              <button onClick={openAddModal} className="px-6 py-3 bg-slate-900 text-white border border-slate-200 rounded-2xl font-medium font-bold text-xs  tracking-normal flex items-center gap-2 hover:bg-white hover:text-slate-900 transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                <Plus className="w-4 h-4" /> New Product
              </button>
              <FileActionMenu label="Bulk Upload" type="import" onAction={() => setIsBulkModalOpen(true)} className="px-6 py-3 bg-blue-600 text-white border border-slate-200 rounded-2xl font-medium font-bold hover:bg-white hover:text-slate-900 text-xs  tracking-normal flex items-center gap-2 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all" />
            </>
          )}
        </div>
      </div>

      {/* Low-Stock Alert System / Prevention Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 shadow-sm no-print space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-rose-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-rose-950 flex flex-wrap items-center gap-2">
                  Low-Stock Warning Center
                  <span className="bg-rose-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                    {lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'items'} below threshold
                  </span>
                </h3>
                <p className="text-rose-700 text-xs mt-1">
                  These items are running dangerously low, creating risks of stock-outs or unaccounted inventory losses. Please restock immediately or audit levels.
                </p>
              </div>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setIsConfiguringLevels(!isConfiguringLevels)} 
                className="text-xs bg-white text-rose-800 border-2 border-rose-200 font-bold px-4 py-2.5 rounded-xl hover:bg-rose-100/50 transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] active:scale-95 flex items-center gap-2 shrink-0 self-start"
              >
                <Save className="w-4 h-4 text-rose-700" />
                {isConfiguringLevels ? "Lock Alert Settings" : "Tune Thresholds"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.slice(0, 6).map(item => (
              <div key={item.id} className="bg-white border border-rose-100 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-[0_2px_10px_rgb(0,0,0,0.02)] group hover:border-rose-300 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-900 truncate">{item.name}</div>
                  <div className="text-[10px] text-rose-600 font-bold mt-0.5">
                    Stock: {item.quantityInStock} {item.unit} (Limit: {item.reorderLevel})
                  </div>
                </div>
                {isConfiguringLevels && isAdmin ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] text-slate-400 font-bold">Limit:</span>
                    <input 
                      type="number"
                      className="w-14 py-1 px-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-center text-xs text-slate-800 focus:outline-none focus:border-rose-400"
                      value={item.reorderLevel}
                      onChange={(e) => handleUpdateThreshold(item, Number(e.target.value))}
                    />
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setStockFilter('low_stock');
                      setSearchTerm(item.name);
                    }}
                    className="text-[10px] text-blue-500 font-bold hover:underline shrink-0"
                  >
                    Locate →
                  </button>
                )}
              </div>
            ))}
            {lowStockItems.length > 6 && (
              <div className="col-span-1 md:col-span-2 lg:col-span-3 text-right">
                <button 
                  onClick={() => setStockFilter('low_stock')}
                  className="text-xs text-rose-700 font-bold hover:underline"
                >
                  View all {lowStockItems.length} low stock items in table &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white/60 backdrop-blur-3xl p-6 border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col md:flex-row gap-4 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900 w-5 h-5" />
          <input type="text" placeholder="Search products..." className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium font-bold text-slate-900 focus:ring-0 outline-none transition-all focus:bg-slate-50" value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
        <select className="px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none font-medium font-bold text-slate-900 focus:bg-slate-50 cursor-pointer" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none font-medium font-bold text-slate-900 focus:bg-slate-50 cursor-pointer" value={stockFilter} onChange={(e) => setStockFilter(e.target.value as 'all' | 'low_stock')}>
          <option value="all">All Stock Statuses</option>
          <option value="low_stock">⚠️ Low Stock Flagged</option>
        </select>
      </div>

      <div className="bg-white/60 backdrop-blur-3xl border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] overflow-hidden print:border-0 print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white border-b-2 border-slate-200 text-slate-500 text-xs font-medium font-bold  tracking-normal">
              <tr>
                <th className="px-6 py-5">Product Name</th>
                <th className="px-6 py-5">Category</th>
                <th className="px-6 py-5">Stock Level</th>
                <th className="px-6 py-5">Selling Price</th>
                <th className="px-6 py-5 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 bg-white/60 backdrop-blur-3xl">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedDetailItem(item)}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="font-medium font-bold text-slate-900 group-hover:text-blue-500 transition-colors">{item.name}</div>
                      {item.allowFractional && (
                        <span className="px-2 py-1 bg-white border border-slate-200 text-slate-900 text-[10px] font-medium font-bold  tracking-normal">Part-Sales</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium font-bold  mt-1">{item.sku}</div>
                  </td>
                  <td className="px-6 py-5 text-sm font-sans font-medium text-slate-900">{categories.find(c => c.id === item.categoryId)?.name || 'N/A'}</td>
                  <td className={`px-6 py-5 font-medium font-bold ${item.quantityInStock <= item.reorderLevel ? 'text-red-600' : 'text-slate-900'}`}>{item.quantityInStock} {item.unit}</td>
                  <td className="px-6 py-5 font-medium font-bold text-slate-900">{formatCurrency(item.sellingPrice)}</td>
                  <td className="px-6 py-5 text-right no-print">
                    <button className="p-2 border border-transparent hover:border-slate-200 hover:bg-white text-slate-400 hover:text-slate-900 transition-all"><Info className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !isImporting && setIsAddModalOpen(false)}></div>
          <div className="relative bg-white/60 backdrop-blur-3xl w-full max-w-xl border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
              <h3 className="text-2xl font-semibold tracking-tight font-medium text-slate-900 tracking-tight">{isEditMode ? 'Edit Product' : 'Add New Product'}</h3>
              <button className="hover:bg-slate-100 p-2 border-2 border-transparent hover:border-slate-200 transition-colors" disabled={isImporting} onClick={() => setIsAddModalOpen(false)}><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSaveItem} className="p-8 space-y-6 overflow-y-auto max-h-[75vh] custom-scrollbar bg-slate-50">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-medium font-bold text-slate-900  tracking-normal block">Product Name</label>
                  <input required className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-sans font-bold text-slate-900 focus:ring-0 outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-medium font-bold text-slate-900  tracking-normal block">Category</label>
                  <select className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-sans font-bold text-slate-900 focus:ring-0 outline-none cursor-pointer" value={newItem.categoryId} onChange={e => setNewItem({...newItem, categoryId: e.target.value})}>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="new">+ Create New</option>
                  </select>
                </div>
                {newItem.categoryId === 'new' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium font-bold text-blue-500  tracking-normal block">New Category Name</label>
                    <input required className="w-full px-5 py-4 bg-white border-2 border-blue-200 text-blue-500 font-sans font-bold focus:ring-0 outline-none" value={newItem.newCategoryName} onChange={e => setNewItem({...newItem, newCategoryName: e.target.value})} />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-medium font-bold text-slate-900  tracking-normal block">Unit</label>
                  <input className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-sans font-bold text-slate-900 focus:ring-0 outline-none" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-medium font-bold text-slate-900  tracking-normal block">Cost Price (₦)</label>
                  <input type="number" step="any" className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-medium font-bold text-slate-900 focus:ring-0 outline-none" value={newItem.costPrice || ''} onFocus={e => e.target.select()} onChange={e => setNewItem({...newItem, costPrice: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-medium font-bold text-blue-500  tracking-normal block">Selling Price (₦)</label>
                  <input type="number" step="any" required className="w-full px-5 py-4 bg-blue-600Light/30 border-2 border-blue-200 font-medium font-bold text-blue-500 focus:ring-0 outline-none" value={newItem.sellingPrice || ''} onFocus={e => e.target.select()} onChange={e => setNewItem({...newItem, sellingPrice: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-medium font-bold text-slate-900  tracking-normal block">Stock Level</label>
                  <input type="number" step="any" className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-medium font-bold text-slate-900 focus:ring-0 outline-none" value={newItem.quantityInStock || ''} onFocus={e => e.target.select()} onChange={e => setNewItem({...newItem, quantityInStock: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-medium font-bold text-slate-900  tracking-normal block">Reorder Level</label>
                  <input type="number" step="any" className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-medium font-bold text-slate-900 focus:ring-0 outline-none" value={newItem.reorderLevel || ''} onFocus={e => e.target.select()} onChange={e => setNewItem({...newItem, reorderLevel: Number(e.target.value)})} />
                </div>
              </div>

              <div className="bg-white p-6 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/60 backdrop-blur-3xl text-slate-900 border border-slate-200 rounded-2xl flex items-center justify-center shrink-0"><Scissors className="w-6 h-6" /></div>
                  <div>
                    <h4 className="text-sm font-sans font-bold text-slate-900">Fractional Selling</h4>
                    <p className="text-[10px] font-medium font-bold text-slate-500  tracking-normal mt-1">Allow sales of portions (1/2, 1/4)</p>
                  </div>
                </div>
                <div 
                  onClick={() => setNewItem({...newItem, allowFractional: !newItem.allowFractional})}
                  className={`w-14 h-8 border border-slate-200 rounded-2xl p-1 cursor-pointer transition-colors duration-200 ease-in-out ${newItem.allowFractional ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <div className={`bg-white border border-slate-200 rounded-2xl w-5 h-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] transform transition-transform duration-200 ease-in-out ${newItem.allowFractional ? 'translate-x-6' : 'translate-x-[2px]'}`} />
                </div>
              </div>

              <button type="submit" disabled={isImporting} className="w-full py-5 bg-blue-600 text-white border border-slate-200 rounded-2xl font-medium font-bold  text-xs tracking-normal shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4">
                {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isEditMode ? 'Update Product' : 'Save Product'}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedDetailItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSelectedDetailItem(null)}></div>
          <div className="relative bg-white/60 backdrop-blur-3xl w-full max-w-2xl border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-blue-600 p-10 text-white border-b border-slate-100 relative">
              <h3 className="text-4xl font-semibold tracking-tight font-medium tracking-tight mb-2">{selectedDetailItem.name}</h3>
              <p className="text-blue-500Light font-medium font-bold  text-xs tracking-normal">{selectedDetailItem.sku}</p>
              {isAdmin && <button onClick={() => openEditModal(selectedDetailItem)} className="absolute top-10 right-10 p-4 bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-sm transition-all"><Edit2 className="w-5 h-5" /></button>}
            </div>
            <div className="p-10 grid grid-cols-2 gap-8 bg-slate-50">
               <div>
                  <p className="text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-2">Stock Availability</p>
                  <p className="text-4xl font-medium font-bold text-slate-900">{selectedDetailItem.quantityInStock} <span className="text-xl text-slate-400">{selectedDetailItem.unit}</span></p>
               </div>
               <div>
                  <p className="text-[10px] font-medium font-bold text-slate-500  tracking-normal mb-2">Sale Price</p>
                  <p className="text-4xl font-medium font-bold text-blue-500">{formatCurrency(selectedDetailItem.sellingPrice)}</p>
               </div>
               {selectedDetailItem.allowFractional && (
                 <div className="col-span-2 p-6 bg-white border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex items-center gap-4">
                   <Scissors className="w-8 h-8 text-slate-900" />
                   <p className="text-sm font-medium font-bold text-slate-900  tracking-normal">Supports Fractional Selling</p>
                 </div>
               )}
            </div>
            <div className="p-10 bg-slate-50 pt-0">
               <button onClick={() => setSelectedDetailItem(null)} className="w-full py-5 bg-white text-slate-900 border border-slate-200 rounded-2xl font-medium font-bold  text-xs tracking-normal shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all">Close Details</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal 
        isOpen={showWipeConfirm}
        onClose={() => setShowWipeConfirm(false)}
        onConfirm={handleWipe}
        title="Wipe Inventory?"
        message="This action will delete every product currently stored in your shop. This cannot be undone."
        confirmLabel="Yes, Wipe Everything"
        variant="danger"
        isLoading={isImporting}
      />
    </div>
  );
};

export default Inventory;